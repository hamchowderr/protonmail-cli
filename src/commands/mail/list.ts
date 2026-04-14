import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailListOptions {
  mailbox?: string;
  limit?: number;
  offset?: number;
  page?: number;
  unread?: boolean;
}

export async function runMailList(ctx: CommandContext, opts: MailListOptions): Promise<void> {
  const mailbox = opts.mailbox ?? ctx.config.defaults.mailbox;
  const limit = opts.limit ?? ctx.config.defaults.limit;
  let offset = opts.offset ?? 0;

  if (opts.page && opts.page > 0) {
    offset = (opts.page - 1) * limit;
  }

  const pw = await getPassword(KEYRING_SERVICE, ctx.config.bridge.email);
  if (!pw) throw new Error('No password found in keyring. Run "config init" first.');

  const imap = new ImapClient({
    host: ctx.config.bridge.imap_host,
    port: ctx.config.bridge.imap_port,
    email: ctx.config.bridge.email,
    password: pw,
  });

  await imap.connect();
  try {
    const messages = await imap.listMessages(mailbox, limit, offset, opts.unread);

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON(messages);
    } else {
      if (messages.length === 0) {
        ctx.formatter.printSuccess('No messages found');
        return;
      }
      const rows = messages.map((m) => ({
        uid: m.uid,
        from: m.from.length > 30 ? m.from.slice(0, 27) + '...' : m.from,
        subject: m.subject.length > 50 ? m.subject.slice(0, 47) + '...' : m.subject,
        date: m.date,
        flags: [m.seen ? '' : 'unread', m.flagged ? 'star' : ''].filter(Boolean).join(',') || '-',
      }));
      ctx.formatter.printTable(rows);
    }
  } finally {
    await imap.disconnect();
  }
}
