import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  create extension if not exists "pgcrypto";

  create table if not exists inboxes (
    id uuid primary key default gen_random_uuid(),
    email_address text unique not null,
    created_at timestamptz not null default now(),
    last_active_at timestamptz not null default now(),
    expires_at timestamptz not null
  );

  create table if not exists emails (
    id uuid primary key default gen_random_uuid(),
    inbox_id uuid not null references inboxes(id) on delete cascade,
    from_address text not null,
    subject text not null default '',
    body_text text not null default '',
    body_html text not null default '',
    received_at timestamptz not null default now(),
    expires_at timestamptz not null,
    is_read boolean not null default false
  );

  create index if not exists emails_inbox_id_idx on emails(inbox_id);
  create index if not exists emails_expires_at_idx on emails(expires_at);
`);

await pool.end();
console.log("Database ready");
