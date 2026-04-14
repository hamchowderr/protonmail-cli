import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailArchiveOptions {
  mailbox?: string;
}

export async function runMailArchive(ctx: CommandContext, ids: string[], opts: MailArchiveOptions): Promise<void> {
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
      await imap.moveMessage(mailbox, id, 'Archive');
      ctx.formatter.verbose(`Archived message ${id}`);
    }

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON({ success: true, archived: ids });
    } else {
      ctx.formatter.printSuccess(`Archived ${ids.length} message(s)`);
    }
  } finally {
    await imap.disconnect();
  }
}
