import { ImapClient } from '../../imap/client.js';
import { getPassword } from '../../config/keyring.js';
import type { CommandContext } from '../context.js';

export async function runMailboxDelete(ctx: CommandContext, name: string): Promise<void> {
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
    await imap.deleteMailbox(name);
    ctx.formatter.printSuccess(`Mailbox "${name}" deleted`);
  } finally {
    await imap.disconnect();
  }
}
