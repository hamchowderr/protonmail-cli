import { ImapClient } from '../../imap/client.js';
import { getPassword } from '../../config/keyring.js';
import type { CommandContext } from '../context.js';

export interface LabelRemoveOptions {
  label: string;
}

export async function runLabelRemove(
  ctx: CommandContext,
  ids: string[],
  opts: LabelRemoveOptions,
): Promise<void> {
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
    await imap.removeLabel(ids, opts.label);
    ctx.formatter.printSuccess(`Label "${opts.label}" removed from ${ids.length} message(s)`);
  } finally {
    await imap.disconnect();
  }
}
