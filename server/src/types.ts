export type Inbox = {
  id: string;
  emailAddress: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
};

export type Mail = {
  id: string;
  inboxId: string;
  fromAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
  expiresAt: Date;
  isRead: boolean;
};

export type IncomingMail = {
  recipient: string;
  sender: string;
  subject: string;
  text?: string;
  html?: string;
};

export type MailStore = {
  createOrGetInbox(emailAddress: string): Promise<Inbox>;
  getInbox(emailAddress: string): Promise<Inbox | null>;
  listEmails(inboxId: string): Promise<Mail[]>;
  deleteInbox(emailAddress: string): Promise<void>;
  extendInbox(emailAddress: string, minutes: number): Promise<Inbox | null>;
  addEmail(mail: IncomingMail, ttlMinutes: number): Promise<Mail | null>;
  deleteEmail(id: string): Promise<void>;
  cleanup(now?: Date): Promise<void>;
};
