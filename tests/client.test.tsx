import { fireEvent, render, screen } from "@testing-library/react";
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
});
