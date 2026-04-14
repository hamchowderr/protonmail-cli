import { ImapClient } from '../../imap/client.js';
import { getPassword } from '../../config/keyring.js';
import type { CommandContext } from '../context.js';

export interface LabelAddOptions {
  label: string;
  mailbox?: string;
}

export async function runLabelAdd(
  ctx: CommandContext,
  ids: string[],
  opts: LabelAddOptions,
): Promise<void> {
  const mailbox = opts.mailbox ?? ctx.config.defaults.mailbox;
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
    await imap.addLabel(mailbox, ids, opts.label);
    ctx.formatter.printSuccess(`Label "${opts.label}" added to ${ids.length} message(s)`);
  } finally {
    await imap.disconnect();
  }
}
