export type Inbox = {
  id: string;
  emailAddress: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
};

export type Email = {
  id: string;
  fromAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
  expiresAt: string;
  isRead: boolean;
};

export type InboxPayload = {
  inbox: Inbox;
  emails: Email[];
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Request failed." }));
    throw new Error(data.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDomains: () => request<{ domains: string[] }>("/api/domains"),
  createInbox: (name: string, domain: string) =>
    request<InboxPayload>("/api/inbox/create", {
      method: "POST",
      body: JSON.stringify({ name, domain })
    }),
  getInbox: (email: string) => request<InboxPayload>(`/api/inbox/${encodeURIComponent(email)}`),
  deleteInbox: (email: string) =>
    fetch(`/api/inbox/${encodeURIComponent(email)}`, { method: "DELETE" }),
  extendInbox: (email: string) =>
    request<{ inbox: Inbox }>(`/api/inbox/${encodeURIComponent(email)}/extend`, { method: "PATCH" }),
  deleteEmail: (id: string) => fetch(`/api/email/${encodeURIComponent(id)}`, { method: "DELETE" })
};
