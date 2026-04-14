import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';
import type { SearchOptions } from '../../imap/types.js';

export interface MailSearchOptions {
  mailbox?: string;
  from?: string;
  subject?: string;
  since?: string;
  before?: string;
}

export async function runMailSearch(ctx: CommandContext, query: string, opts: MailSearchOptions): Promise<void> {
  const mailbox = opts.mailbox ?? ctx.config.defaults.mailbox;

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
    const searchOpts: SearchOptions = {
      query,
      from: opts.from,
      subject: opts.subject,
      since: opts.since,
      before: opts.before,
    };

    const messages = await imap.searchMessages(mailbox, searchOpts);

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
      }));
      ctx.formatter.printTable(rows);
    }
  } finally {
    await imap.disconnect();
  }
}
