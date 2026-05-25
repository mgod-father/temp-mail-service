import cors from "cors";
import express from "express";
import path from "path";
import { config } from "./config";
import type { MailStore } from "./types";
import { buildEmail, normalizeEmail } from "./utils";

export function createApp(store: MailStore) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.static(path.join(process.cwd(), "dist")));

  app.get("/api/domains", (_req, res) => {
    res.json({ domains: config.domains });
  });

  app.post("/api/inbox/create", async (req, res) => {
    try {
      const domain = String(req.body.domain ?? "");
      if (!config.domains.includes(domain.toLowerCase().replace(/^@/, ""))) {
        return res.status(400).json({ error: "Domain is not allowed." });
      }

      const emailAddress = buildEmail(String(req.body.name ?? ""), domain);
      const inbox = await store.createOrGetInbox(emailAddress);
      const emails = await store.listEmails(inbox.id);
      res.json({ inbox: serializeInbox(inbox), emails: emails.map(serializeEmail) });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request." });
    }
  });

  app.get("/api/inbox/:email", async (req, res) => {
    const inbox = await store.getInbox(normalizeEmail(req.params.email));
    if (!inbox) return res.status(404).json({ error: "Inbox not found." });

    const emails = await store.listEmails(inbox.id);
    res.json({ inbox: serializeInbox(inbox), emails: emails.map(serializeEmail) });
  });

  app.delete("/api/inbox/:email", async (req, res) => {
    await store.deleteInbox(req.params.email);
    res.status(204).send();
  });

  app.patch("/api/inbox/:email/extend", async (req, res) => {
    const inbox = await store.extendInbox(req.params.email, config.emailTtlMinutes);
    if (!inbox) return res.status(404).json({ error: "Inbox not found." });
    res.json({ inbox: serializeInbox(inbox) });
  });

  app.delete("/api/email/:id", async (req, res) => {
    await store.deleteEmail(req.params.id);
    res.status(204).send();
  });

  app.post("/api/webhook/email", async (req, res) => {
    const email = await store.addEmail(
      {
        recipient: String(req.body.recipient ?? ""),
        sender: String(req.body.sender ?? req.body.from ?? ""),
        subject: String(req.body.subject ?? ""),
        text: req.body.text,
        html: req.body.html ?? req.body.bodyHtml ?? req.body.body_html
      },
      config.emailTtlMinutes
    );

    if (!email) return res.status(404).json({ error: "Inbox not found." });
    res.json({ email: serializeEmail(email) });
  });

  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(process.cwd(), "dist", "index.html"));
  });

  return app;
}

function serializeInbox(inbox: { id: string; emailAddress: string; createdAt: Date; lastActiveAt: Date; expiresAt: Date }) {
  return {
    id: inbox.id,
    emailAddress: inbox.emailAddress,
    createdAt: inbox.createdAt.toISOString(),
    lastActiveAt: inbox.lastActiveAt.toISOString(),
    expiresAt: inbox.expiresAt.toISOString()
  };
}

function serializeEmail(email: {
  id: string;
  fromAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
  expiresAt: Date;
  isRead: boolean;
}) {
  return {
    id: email.id,
    fromAddress: email.fromAddress,
    subject: email.subject,
    bodyText: email.bodyText,
    bodyHtml: email.bodyHtml,
    receivedAt: email.receivedAt.toISOString(),
    expiresAt: email.expiresAt.toISOString(),
    isRead: email.isRead
  };
}
