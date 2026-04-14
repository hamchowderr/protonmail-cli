import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailMoveOptions {
  mailbox?: string;
}

export async function runMailMove(ctx: CommandContext, id: string, destination: string, opts: MailMoveOptions): Promise<void> {
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
    await imap.moveMessage(mailbox, id, destination);

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON({ success: true, id, from: mailbox, to: destination });
    } else {
      ctx.formatter.printSuccess(`Moved message ${id} to ${destination}`);
    }
  } finally {
    await imap.disconnect();
  }
}
