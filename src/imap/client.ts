import { ImapFlow } from 'imapflow';
import type { FetchMessageObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseMessageSelector } from './types.js';
import { formatSender } from '../config/types.js';
import type {
  MailboxInfo,
  MailboxStatus,
  MessageSummary,
  Message,
  Attachment,
  SearchOptions,
  DraftMessage,
  MessageSelector,
} from './types.js';

export interface ImapClientOptions {
  host: string;
  port: number;
  email: string;
  password: string;
  /** Display name for the From header of saved drafts. */
  name?: string;
}

export class ImapClient {
  private client: ImapFlow;
  private email: string;
  private name?: string;

  constructor(opts: ImapClientOptions) {
    this.email = opts.email;
    this.name = opts.name;
    this.client = new ImapFlow({
      host: opts.host,
      port: opts.port,
      secure: false,
      auth: { user: opts.email, pass: opts.password },
      tls: { rejectUnauthorized: false },
      logger: false,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.logout();
  }

  async listMessages(
    mailbox: string,
    limit = 20,
    offset = 0,
    unreadOnly = false,
  ): Promise<MessageSummary[]> {
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const status = this.client.mailbox;
      if (!status) return [];

      const total = status.exists ?? 0;
      if (total === 0) return [];

      const end = Math.max(total - offset, 1);
      const start = Math.max(end - limit + 1, 1);
      const range = `${start}:${end}`;

      const messages: MessageSummary[] = [];

      for await (const msg of this.client.fetch(range, {
        envelope: true,
        flags: true,
        uid: true,
      })) {
        if (unreadOnly && msg.flags?.has('\\Seen')) continue;
        messages.push(fetchToSummary(msg));
      }

      messages.reverse();
      return messages;
    } finally {
      lock.release();
    }
  }

  async getMessage(mailbox: string, selector: string): Promise<Message> {
    const sel = parseMessageSelector(selector);
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const fetchOpts = {
        envelope: true,
        flags: true,
        uid: true,
        bodyStructure: true,
        source: true,
      };

      const result = sel.kind === 'uid'
        ? await this.client.fetchOne(String(sel.uid), fetchOpts, { uid: true })
        : await this.client.fetchOne(String(sel.seq), fetchOpts);

      if (!result) throw new Error(`Message not found: ${selector}`);
      const msg = result;

      if (!msg.source) throw new Error(`No message source available for: ${selector}`);
      const parsed = await simpleParser(msg.source);

      const attachments: Attachment[] = (parsed.attachments ?? []).map((att: { filename?: string; contentType: string; size: number }, i: number) => ({
        index: i,
        filename: att.filename ?? `attachment-${i}`,
        content_type: att.contentType,
        size: att.size,
      }));

      const envelope = msg.envelope;
      const flags = Array.from(msg.flags ?? []);

      return {
        uid: msg.uid,
        seq_num: msg.seq,
        from: formatAddress(envelope?.from),
        subject: envelope?.subject ?? '',
        date: envelope?.date?.toUTCString() ?? '',
        date_iso: envelope?.date?.toISOString() ?? '',
        seen: flags.includes('\\Seen'),
        flagged: flags.includes('\\Flagged'),
        message_id: envelope?.messageId ?? '',
        in_reply_to: envelope?.inReplyTo ?? '',
        references: parseReferences(parsed.references),
        to: formatAddressList(envelope?.to),
        cc: formatAddressList(envelope?.cc),
        flags,
        labels: [],
        text_body: parsed.text ?? '',
        html_body: parsed.html || '',
        attachments,
      };
    } finally {
      lock.release();
    }
  }

  async downloadAttachment(
    mailbox: string,
    selector: string,
    attachmentIndex: number,
  ): Promise<Attachment> {
    const sel = parseMessageSelector(selector);
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const fetchOpts = { source: true, uid: true };
      const result = sel.kind === 'uid'
        ? await this.client.fetchOne(String(sel.uid), fetchOpts, { uid: true })
        : await this.client.fetchOne(String(sel.seq), fetchOpts);

      if (!result) throw new Error(`Message not found: ${selector}`);
      if (!result.source) throw new Error(`No message source available for: ${selector}`);

      const parsed = await simpleParser(result.source);
      const atts = parsed.attachments ?? [];
      const att = atts[attachmentIndex];
      if (!att) {
        throw new Error(`Attachment index ${attachmentIndex} not found`);
      }

      return {
        index: attachmentIndex,
        filename: att.filename ?? `attachment-${attachmentIndex}`,
        content_type: att.contentType,
        size: att.size,
        data: Buffer.from(att.content),
      };
    } finally {
      lock.release();
    }
  }

  async searchMessages(
    mailbox: string,
    opts: SearchOptions,
  ): Promise<MessageSummary[]> {
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const criteria: Record<string, unknown>[] = [];

      if (opts.from) criteria.push({ from: opts.from });
      if (opts.to) criteria.push({ to: opts.to });
      if (opts.subject) criteria.push({ subject: opts.subject });
      if (opts.body) criteria.push({ body: opts.body });
      if (opts.query) criteria.push({ body: opts.query });
      if (opts.since) criteria.push({ since: new Date(opts.since) });
      if (opts.before) criteria.push({ before: new Date(opts.before) });
      if (opts.hasAttachments) criteria.push({ header: { 'content-type': 'multipart/mixed' } });
      if (opts.largerThan) criteria.push({ larger: opts.largerThan });
      if (opts.smallerThan) criteria.push({ smaller: opts.smallerThan });

      if (criteria.length === 0) return [];

      let query: Record<string, unknown>;
      if (opts.useOr && criteria.length > 1) {
        query = { or: criteria };
      } else if (criteria.length === 1) {
        query = criteria[0]!;
      } else {
        query = Object.assign({}, ...criteria) as Record<string, unknown>;
      }

      const searchResult = await this.client.search(query, { uid: true });
      const uids = searchResult || [];
      if (uids.length === 0) return [];

      const messages: MessageSummary[] = [];
      for await (const msg of this.client.fetch(uids.join(','), {
        envelope: true,
        flags: true,
        uid: true,
      }, { uid: true })) {
        messages.push(fetchToSummary(msg));
      }

      return messages;
    } finally {
      lock.release();
    }
  }

  async setFlags(
    mailbox: string,
    selector: string,
    opts: { seen?: boolean; flagged?: boolean },
  ): Promise<void> {
    const sel = parseMessageSelector(selector);
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const id = selectorToId(sel);
      const uidOpt = sel.kind === 'uid' ? { uid: true } : undefined;

      const addFlags: string[] = [];
      const removeFlags: string[] = [];

      if (opts.seen === true) addFlags.push('\\Seen');
      if (opts.seen === false) removeFlags.push('\\Seen');
      if (opts.flagged === true) addFlags.push('\\Flagged');
      if (opts.flagged === false) removeFlags.push('\\Flagged');

      if (addFlags.length > 0) {
        await this.client.messageFlagsAdd(id, addFlags, uidOpt);
      }
      if (removeFlags.length > 0) {
        await this.client.messageFlagsRemove(id, removeFlags, uidOpt);
      }
    } finally {
      lock.release();
    }
  }

  async moveMessage(
    mailbox: string,
    selector: string,
    destination: string,
  ): Promise<void> {
    const sel = parseMessageSelector(selector);
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const id = selectorToId(sel);
      const uidOpt = sel.kind === 'uid' ? { uid: true } : undefined;
      await this.client.messageMove(id, destination, uidOpt);
    } finally {
      lock.release();
    }
  }

  async deleteMessage(
    mailbox: string,
    selector: string,
    permanent = false,
  ): Promise<void> {
    const sel = parseMessageSelector(selector);
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const id = selectorToId(sel);
      const uidOpt = sel.kind === 'uid' ? { uid: true } : undefined;

      if (permanent) {
        await this.client.messageFlagsAdd(id, ['\\Deleted'], uidOpt);
        await this.client.messageDelete(id, uidOpt);
      } else {
        await this.client.messageMove(id, 'Trash', uidOpt);
      }
    } finally {
      lock.release();
    }
  }

  async listMailboxes(): Promise<MailboxInfo[]> {
    const list = await this.client.list();
    return list.map((mb) => ({
      name: mb.path,
      delimiter: mb.delimiter ?? '/',
      attributes: Array.from(mb.flags ?? []),
    }));
  }

  async createMailbox(name: string): Promise<void> {
    await this.client.mailboxCreate(name);
  }

  async deleteMailbox(name: string): Promise<void> {
    await this.client.mailboxDelete(name);
  }

  async getMailboxStatus(name: string): Promise<MailboxStatus> {
    const status = await this.client.status(name, {
      messages: true,
      recent: true,
      unseen: true,
    });
    return {
      name,
      messages: status.messages ?? 0,
      recent: status.recent ?? 0,
      unseen: status.unseen ?? 0,
    };
  }

  async getThread(mailbox: string, selector: string): Promise<Message[]> {
    const root = await this.getMessage(mailbox, selector);
    const messageIds = new Set<string>();

    if (root.message_id) messageIds.add(root.message_id);
    if (root.in_reply_to) messageIds.add(root.in_reply_to);
    for (const ref of root.references) {
      messageIds.add(ref);
    }

    if (messageIds.size === 0) return [root];

    const thread: Message[] = [root];
    const seenUids = new Set<number>([root.uid]);

    for (const mid of messageIds) {
      if (!mid) continue;
      try {
        const uids = await this.searchByHeader(mailbox, 'Message-ID', mid);
        for (const uid of uids) {
          if (!seenUids.has(uid)) {
            seenUids.add(uid);
            const msg = await this.getMessage(mailbox, `uid:${uid}`);
            thread.push(msg);
          }
        }
      } catch {
        // Ignore search failures for individual message IDs
      }
    }

    thread.sort((a, b) => new Date(a.date_iso).getTime() - new Date(b.date_iso).getTime());
    return thread;
  }

  async listDrafts(limit = 20): Promise<MessageSummary[]> {
    return this.listMessages('Drafts', limit);
  }

  async saveDraft(draft: DraftMessage): Promise<number> {
    const mimeLines = [
      // The sender is this account's configured address. Using draft.to[0] here
      // set From to the first recipient, which Bridge then rewrote to the
      // account default, silently ignoring the configured address.
      `From: ${this.name?.trim() ? formatSender(this.email, this.name) : `<${this.email}>`}`,
      `To: ${draft.to.join(', ')}`,
    ];
    if (draft.cc?.length) mimeLines.push(`Cc: ${draft.cc.join(', ')}`);
    if (draft.bcc?.length) mimeLines.push(`Bcc: ${draft.bcc.join(', ')}`);
    mimeLines.push(`Subject: ${draft.subject}`);
    mimeLines.push('MIME-Version: 1.0');

    const files = draft.attachments ?? [];

    if (files.length === 0) {
      mimeLines.push('Content-Type: text/plain; charset=utf-8');
      mimeLines.push('');
      mimeLines.push(draft.body);
    } else {
      // Attachments were previously accepted by the CLI and then dropped here:
      // the message was always built as a flat text/plain part, so `-a` silently
      // did nothing. A draft carrying files has to be multipart/mixed.
      const boundary = `----pmcli_${randomBytes(12).toString('hex')}`;
      mimeLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      mimeLines.push('');
      mimeLines.push(`--${boundary}`);
      mimeLines.push('Content-Type: text/plain; charset=utf-8');
      mimeLines.push('Content-Transfer-Encoding: 8bit');
      mimeLines.push('');
      mimeLines.push(draft.body);

      for (const file of files) {
        const data = await readFile(file);
        const name = basename(file);
        mimeLines.push('');
        mimeLines.push(`--${boundary}`);
        mimeLines.push(`Content-Type: ${mimeTypeFor(name)}; name="${name}"`);
        mimeLines.push('Content-Transfer-Encoding: base64');
        mimeLines.push(`Content-Disposition: attachment; filename="${name}"`);
        mimeLines.push('');
        // RFC 2045 caps base64 lines at 76 characters.
        mimeLines.push(data.toString('base64').replace(/(.{76})/g, '$1\r\n'));
      }

      mimeLines.push('');
      mimeLines.push(`--${boundary}--`);
    }

    const raw = Buffer.from(mimeLines.join('\r\n'));

    const result = await this.client.append('Drafts', raw, ['\\Draft', '\\Seen']);
    return typeof result === 'object' && result !== null && 'uid' in result
      ? (result as { uid: number }).uid
      : 0;
  }

  async deleteDraft(selector: string): Promise<void> {
    await this.deleteMessage('Drafts', selector, true);
  }

  async listLabels(): Promise<string[]> {
    const mailboxes = await this.client.list();
    return mailboxes
      .filter((mb) => mb.path.startsWith('Labels/'))
      .map((mb) => mb.path.replace(/^Labels\//, ''));
  }

  async addLabel(
    mailbox: string,
    selectors: string[],
    label: string,
  ): Promise<void> {
    const target = `Labels/${label}`;
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      for (const selector of selectors) {
        const sel = parseMessageSelector(selector);
        const id = selectorToId(sel);
        const uidOpt = sel.kind === 'uid' ? { uid: true } : undefined;
        await this.client.messageCopy(id, target, uidOpt);
      }
    } finally {
      lock.release();
    }
  }

  async removeLabel(selectors: string[], label: string): Promise<void> {
    const target = `Labels/${label}`;
    const lock = await this.client.getMailboxLock(target);
    try {
      for (const selector of selectors) {
        const sel = parseMessageSelector(selector);
        const id = selectorToId(sel);
        const uidOpt = sel.kind === 'uid' ? { uid: true } : undefined;
        await this.client.messageFlagsAdd(id, ['\\Deleted'], uidOpt);
      }
      await this.client.messageDelete('1:*');
    } finally {
      lock.release();
    }
  }

  private async searchByHeader(
    mailbox: string,
    header: string,
    value: string,
  ): Promise<number[]> {
    const lock = await this.client.getMailboxLock(mailbox);
    try {
      const result = await this.client.search({ header: { [header]: value } }, { uid: true });
      return result || [];
    } finally {
      lock.release();
    }
  }
}

function selectorToId(sel: MessageSelector): string {
  return sel.kind === 'uid' ? String(sel.uid) : String(sel.seq);
}

function formatAddress(addrs: Array<{ name?: string; address?: string }> | undefined): string {
  if (!addrs?.length) return '';
  const a = addrs[0]!;
  if (a.name && a.address) return `${a.name} <${a.address}>`;
  return a.address ?? a.name ?? '';
}

function formatAddressList(addrs: Array<{ name?: string; address?: string }> | undefined): string[] {
  if (!addrs) return [];
  return addrs.map((a) => {
    if (a.name && a.address) return `${a.name} <${a.address}>`;
    return a.address ?? a.name ?? '';
  });
}

function parseReferences(refs: string | string[] | undefined): string[] {
  if (!refs) return [];
  if (Array.isArray(refs)) return refs;
  return refs.split(/\s+/).filter(Boolean);
}

function fetchToSummary(msg: FetchMessageObject): MessageSummary {
  const flags = Array.from(msg.flags ?? []);
  return {
    uid: msg.uid,
    seq_num: msg.seq,
    from: formatAddress(msg.envelope?.from),
    subject: msg.envelope?.subject ?? '',
    date: msg.envelope?.date?.toUTCString() ?? '',
    date_iso: msg.envelope?.date?.toISOString() ?? '',
    seen: flags.includes('\\Seen'),
    flagged: flags.includes('\\Flagged'),
  };
}

/**
 * Minimal extension-to-MIME mapping for attachments. Falls back to
 * application/octet-stream, which every mail client handles as a download.
 */
function mimeTypeFor(filename: string): string {
  const types: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.zip': 'application/zip',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return types[extname(filename).toLowerCase()] ?? 'application/octet-stream';
}
