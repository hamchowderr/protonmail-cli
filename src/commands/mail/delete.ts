import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailDeleteOptions {
  permanent?: boolean;
  mailbox?: string;
}

export async function runMailDelete(ctx: CommandContext, ids: string[], opts: MailDeleteOptions): Promise<void> {
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
    for (const id of ids) {
      await imap.deleteMessage(mailbox, id, opts.permanent);
      ctx.formatter.verbose(`Deleted message ${id}`);
    }

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON({ success: true, deleted: ids });
    } else {
      ctx.formatter.printSuccess(`Deleted ${ids.length} message(s)`);
    }
  } finally {
    await imap.disconnect();
  }
}
