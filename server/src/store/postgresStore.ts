import pg from "pg";
import type { IncomingMail, MailStore } from "../types";
import { addMinutes, normalizeEmail } from "../utils";

const { Pool } = pg;

export function createPostgresStore(databaseUrl: string): MailStore {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    async createOrGetInbox(emailAddress) {
      const email = normalizeEmail(emailAddress);
      const { rows } = await pool.query(
        `insert into inboxes (email_address, expires_at)
         values ($1, now() + interval '30 minutes')
         on conflict (email_address)
         do update set last_active_at = now()
         returning *`,
        [email]
      );
      return mapInbox(rows[0]);
    },

    async getInbox(emailAddress) {
      const { rows } = await pool.query(
        `update inboxes set last_active_at = now()
         where email_address = $1 and expires_at > now()
         returning *`,
        [normalizeEmail(emailAddress)]
      );
      return rows[0] ? mapInbox(rows[0]) : null;
    },

    async listEmails(inboxId) {
      const { rows } = await pool.query(
        `select * from emails
         where inbox_id = $1 and expires_at > now()
         order by received_at desc`,
        [inboxId]
      );
      return rows.map(mapEmail);
    },

    async deleteInbox(emailAddress) {
      await pool.query("delete from inboxes where email_address = $1", [normalizeEmail(emailAddress)]);
    },

    async extendInbox(emailAddress, minutes) {
      const { rows } = await pool.query(
        `update inboxes
         set expires_at = greatest(expires_at, now()) + ($2 || ' minutes')::interval,
             last_active_at = now()
         where email_address = $1
         returning *`,
        [normalizeEmail(emailAddress), minutes]
      );
      return rows[0] ? mapInbox(rows[0]) : null;
    },

    async addEmail(mail: IncomingMail, ttlMinutes) {
      const inbox = await this.getInbox(mail.recipient);
      if (!inbox) return null;

      const { rows } = await pool.query(
        `insert into emails (inbox_id, from_address, subject, body_text, body_html, expires_at)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [
          inbox.id,
          mail.sender,
          mail.subject || "(No subject)",
          mail.text ?? "",
          mail.html ?? "",
          addMinutes(new Date(), ttlMinutes)
        ]
      );
      return mapEmail(rows[0]);
    },

    async deleteEmail(id) {
      await pool.query("delete from emails where id = $1", [id]);
    },

    async cleanup() {
      await pool.query("delete from emails where expires_at <= now()");
      await pool.query(
        `delete from inboxes
         where expires_at <= now()
            or last_active_at <= now() - interval '30 minutes'`
      );
    }
  };
}

function mapInbox(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    emailAddress: String(row.email_address),
    createdAt: new Date(String(row.created_at)),
    lastActiveAt: new Date(String(row.last_active_at)),
    expiresAt: new Date(String(row.expires_at))
  };
}

function mapEmail(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    inboxId: String(row.inbox_id),
    fromAddress: String(row.from_address),
    subject: String(row.subject),
    bodyText: String(row.body_text ?? ""),
    bodyHtml: String(row.body_html ?? ""),
    receivedAt: new Date(String(row.received_at)),
    expiresAt: new Date(String(row.expires_at)),
    isRead: Boolean(row.is_read)
  };
}
