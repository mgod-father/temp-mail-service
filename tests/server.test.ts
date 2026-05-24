import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/src/app";
import { createMemoryStore } from "../server/src/store/memoryStore";

describe("temp mail api", () => {
  it("creates and opens an active inbox", async () => {
    const app = createApp(createMemoryStore());

    const first = await request(app)
      .post("/api/inbox/create")
      .send({ name: "john", domain: "only4traders.tech" });

    const second = await request(app)
      .post("/api/inbox/create")
      .send({ name: "john", domain: "only4traders.tech" });

    expect(first.status).toBe(200);
    expect(second.body.inbox.emailAddress).toBe("john@only4traders.tech");
    expect(second.body.inbox.id).toBe(first.body.inbox.id);
  });

  it("stores webhook email for matching inbox", async () => {
    const app = createApp(createMemoryStore());
    await request(app).post("/api/inbox/create").send({ name: "mail", domain: "only4traders.tech" });

    const webhook = await request(app).post("/api/webhook/email").send({
      recipient: "mail@only4traders.tech",
      sender: "sender@test.com",
      subject: "Hello",
      text: "Plain body",
      html: "<p>Plain body</p>"
    });

    const inbox = await request(app).get("/api/inbox/mail@only4traders.tech");

    expect(webhook.status).toBe(200);
    expect(inbox.body.emails).toHaveLength(1);
    expect(inbox.body.emails[0].subject).toBe("Hello");
  });

  it("extends an inbox by 15 minutes", async () => {
    const app = createApp(createMemoryStore());
    const created = await request(app).post("/api/inbox/create").send({ name: "time", domain: "only4traders.tech" });

    const extended = await request(app).patch("/api/inbox/time@only4traders.tech/extend");

    expect(new Date(extended.body.inbox.expiresAt).getTime()).toBeGreaterThan(
      new Date(created.body.inbox.expiresAt).getTime()
    );
  });
});
