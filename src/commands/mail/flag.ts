import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailFlagOptions {
  read?: boolean;
  unread?: boolean;
  star?: boolean;
  unstar?: boolean;
  mailbox?: string;
}

export async function runMailFlag(ctx: CommandContext, id: string, opts: MailFlagOptions): Promise<void> {
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
    const flagOpts: { seen?: boolean; flagged?: boolean } = {};

    if (opts.read) flagOpts.seen = true;
    if (opts.unread) flagOpts.seen = false;
    if (opts.star) flagOpts.flagged = true;
    if (opts.unstar) flagOpts.flagged = false;

    await imap.setFlags(mailbox, id, flagOpts);

    const changes: string[] = [];
    if (opts.read) changes.push('marked read');
    if (opts.unread) changes.push('marked unread');
    if (opts.star) changes.push('starred');
    if (opts.unstar) changes.push('unstarred');

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON({ success: true, id, changes });
    } else {
      ctx.formatter.printSuccess(`Message ${id}: ${changes.join(', ')}`);
    }
  } finally {
    await imap.disconnect();
  }
}
