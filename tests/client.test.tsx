import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../client/src/App";

describe("temp mail ui", () => {
  it("creates inbox and shows copy button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          inbox: {
            id: "1",
            emailAddress: "john@only4traders.tech",
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 900000).toISOString()
          },
          emails: []
        })
      })
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText(/custom name/i), { target: { value: "john" } });
    fireEvent.click(screen.getByRole("button", { name: /create inbox/i }));

    expect(await screen.findByText("john@only4traders.tech")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("renders html emails inside a sandboxed iframe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          inbox: {
            id: "1",
            emailAddress: "john@only4traders.tech",
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 900000).toISOString()
          },
          emails: [{
            id: "email-1",
            fromAddress: "sender@test.com",
            subject: "Hello",
            bodyText: "Plain body",
            bodyHtml: "<h1>Hello HTML</h1>",
            receivedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 900000).toISOString(),
            isRead: false
          }]
        })
      })
    );

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /create inbox/i }));

    const frame = await screen.findByTitle("Email HTML content");

    expect(frame).toHaveAttribute("srcdoc", "<h1>Hello HTML</h1>");
    expect(frame).toHaveAttribute("sandbox", "allow-same-origin");
  });

  it("refreshes the current inbox when refresh is clicked", async () => {
    const fetch = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/domains") {
        return Promise.resolve({ ok: true, json: async () => ({ domains: ["only4traders.tech", "xchartingview.com"] }) });
      }

      if (url.startsWith("/api/inbox/") && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inbox: {
              id: "1",
              emailAddress: "john@only4traders.tech",
              createdAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 900000).toISOString()
            },
            emails: [{
              id: "email-1",
              fromAddress: "sender@test.com",
              subject: "Fresh email",
              bodyText: "Fresh body",
              bodyHtml: "",
              receivedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 900000).toISOString(),
              isRead: false
            }]
          })
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          inbox: {
            id: "1",
            emailAddress: "john@only4traders.tech",
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 900000).toISOString()
          },
          emails: []
        })
      });
    });

    vi.stubGlobal("fetch", fetch);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /create inbox/i }));
    await screen.findByText("john@only4traders.tech");

    fireEvent.click(screen.getByRole("button", { name: /refresh inbox/i }));

    expect(await screen.findAllByText("Fresh email")).toHaveLength(2);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/inbox/john%40only4traders.tech", expect.any(Object)));
  });
});
