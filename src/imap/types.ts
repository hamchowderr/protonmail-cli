export interface MailboxInfo {
  name: string;
  delimiter: string;
  attributes: string[];
}

export interface MailboxStatus {
  name: string;
  messages: number;
  recent: number;
  unseen: number;
}

export interface MessageSummary {
  uid: number;
  seq_num: number;
  from: string;
  subject: string;
  date: string;
  date_iso: string;
  seen: boolean;
  flagged: boolean;
}

export interface Message extends MessageSummary {
  message_id: string;
  in_reply_to: string;
  references: string[];
  to: string[];
  cc: string[];
  flags: string[];
  labels: string[];
  text_body: string;
  html_body: string;
  attachments: Attachment[];
}

export interface Attachment {
  index: number;
  filename: string;
  content_type: string;
  size: number;
  data?: Buffer;
}

export interface SearchOptions {
  query?: string;
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  since?: string;
  before?: string;
  hasAttachments?: boolean;
  largerThan?: number;
  smallerThan?: number;
  useOr?: boolean;
  negate?: boolean;
}

export interface DraftMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: string[];
}

export type MessageSelector =
  | { kind: 'seq'; seq: number }
  | { kind: 'uid'; uid: number };

export function parseMessageSelector(id: string): MessageSelector {
  const trimmed = id.trim();
  if (/^uid:/i.test(trimmed)) {
    const uid = parseInt(trimmed.slice(4), 10);
    if (!uid || uid <= 0) throw new Error(`Invalid UID selector: ${id}`);
    return { kind: 'uid', uid };
  }
  const seq = parseInt(trimmed, 10);
  if (!seq || seq <= 0) throw new Error(`Invalid message ID: ${id}`);
  return { kind: 'seq', seq };
}
