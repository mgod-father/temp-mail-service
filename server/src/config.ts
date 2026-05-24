import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  domains: (process.env.ALLOWED_DOMAINS ?? "only4traders.tech")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean),
  emailTtlMinutes: Number(process.env.EMAIL_TTL_MINUTES ?? 15),
  inboxIdleTtlMinutes: Number(process.env.INBOX_IDLE_TTL_MINUTES ?? 30)
};
