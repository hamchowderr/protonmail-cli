import { ImapClient } from '../../imap/client.js';
import { getPassword } from '../../config/keyring.js';
import type { CommandContext } from '../context.js';

export async function runMailboxList(ctx: CommandContext): Promise<void> {
  const password = await getPassword(undefined, ctx.config.bridge.email);
  if (!password) throw new Error('No password found. Run: protonmail-cli config set-password');

  const imap = new ImapClient({
    host: ctx.config.bridge.imap_host,
    port: ctx.config.bridge.imap_port,
    email: ctx.config.bridge.email,
    password,
  });

  await imap.connect();
  try {
    const mailboxes = await imap.listMailboxes();
    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON(mailboxes);
    } else {
      ctx.formatter.printTable(
        mailboxes.map((mb) => ({
          name: mb.name,
          delimiter: mb.delimiter,
          attributes: mb.attributes.join(', '),
        })),
      );
    }
  } finally {
    await imap.disconnect();
  }
}
