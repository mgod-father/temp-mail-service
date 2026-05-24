import { randomUUID } from "node:crypto";
import { config } from "../config";
import type { Inbox, IncomingMail, Mail, MailStore } from "../types";
import { addMinutes, normalizeEmail } from "../utils";

export function createMemoryStore(): MailStore {
  const inboxes = new Map<string, Inbox>();
  const emails = new Map<string, Mail>();

  return {
    async createOrGetInbox(emailAddress) {
      const now = new Date();
      const key = normalizeEmail(emailAddress);
      const active = inboxes.get(key);

      if (active && active.expiresAt > now) {
        active.lastActiveAt = now;
        return active;
      }

      const inbox: Inbox = {
        id: randomUUID(),
        emailAddress: key,
        createdAt: now,
        lastActiveAt: now,
        expiresAt: addMinutes(now, config.inboxIdleTtlMinutes)
      };

      inboxes.set(key, inbox);
      return inbox;
    },

    async getInbox(emailAddress) {
      const inbox = inboxes.get(normalizeEmail(emailAddress));
      if (!inbox) return null;
      inbox.lastActiveAt = new Date();
      return inbox;
    },

    async listEmails(inboxId) {
      const now = new Date();
      return [...emails.values()]
        .filter((email) => email.inboxId === inboxId && email.expiresAt > now)
        .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    },

    async deleteInbox(emailAddress) {
      const inbox = inboxes.get(normalizeEmail(emailAddress));
      if (!inbox) return;
      inboxes.delete(inbox.emailAddress);
      for (const email of emails.values()) {
        if (email.inboxId === inbox.id) emails.delete(email.id);
      }
    },

    async extendInbox(emailAddress, minutes) {
      const inbox = inboxes.get(normalizeEmail(emailAddress));
      if (!inbox) return null;
      inbox.expiresAt = addMinutes(inbox.expiresAt > new Date() ? inbox.expiresAt : new Date(), minutes);
      inbox.lastActiveAt = new Date();
      return inbox;
    },

    async addEmail(mail, ttlMinutes) {
      const inbox = inboxes.get(normalizeEmail(mail.recipient));
      if (!inbox || inbox.expiresAt <= new Date()) return null;

      const now = new Date();
      const email: Mail = {
        id: randomUUID(),
        inboxId: inbox.id,
        fromAddress: mail.sender,
        subject: mail.subject || "(No subject)",
        bodyText: mail.text ?? "",
        bodyHtml: mail.html ?? "",
        receivedAt: now,
        expiresAt: addMinutes(now, ttlMinutes),
        isRead: false
      };

      emails.set(email.id, email);
      return email;
    },

    async deleteEmail(id) {
      emails.delete(id);
    },

    async cleanup(now = new Date()) {
      for (const email of emails.values()) {
        if (email.expiresAt <= now) emails.delete(email.id);
      }

      for (const inbox of inboxes.values()) {
        const inactive = addMinutes(inbox.lastActiveAt, config.inboxIdleTtlMinutes) <= now;
        if (inbox.expiresAt <= now || inactive) {
          await this.deleteInbox(inbox.emailAddress);
        }
      }
    }
  };
}
