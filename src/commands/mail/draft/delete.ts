import type { CommandContext } from '../../context.js';
import { ImapClient } from '../../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../../config/keyring.js';

export async function runDraftDelete(ctx: CommandContext, ids: string[]): Promise<void> {
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
      await imap.deleteDraft(id);
      ctx.formatter.verbose(`Deleted draft ${id}`);
    }

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON({ success: true, deleted: ids });
    } else {
      ctx.formatter.printSuccess(`Deleted ${ids.length} draft(s)`);
    }
  } finally {
    await imap.disconnect();
  }
}
