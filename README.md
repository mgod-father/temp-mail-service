# Temp Mail Service

Self-hosted temporary email service with React, Express, PostgreSQL, and Cloudflare Email Routing.

## Setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Open `http://localhost:5173`.

## Cloudflare Worker Shape

Forward parsed mail to:

```http
POST /api/webhook/email
```

Body:

```json
{
  "recipient": "john@only4traders.tech",
  "sender": "sender@example.com",
  "subject": "Hello",
  "text": "Plain body",
  "html": "<p>Plain body</p>"
}
```
