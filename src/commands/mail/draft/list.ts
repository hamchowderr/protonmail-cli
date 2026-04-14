import type { CommandContext } from '../../context.js';
import { ImapClient } from '../../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../../config/keyring.js';

export interface DraftListOptions {
  limit?: number;
}

export async function runDraftList(ctx: CommandContext, opts: DraftListOptions): Promise<void> {
  const limit = opts.limit ?? ctx.config.defaults.limit;

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
    const drafts = await imap.listDrafts(limit);

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON(drafts);
    } else {
      if (drafts.length === 0) {
        ctx.formatter.printSuccess('No drafts found');
        return;
      }
      const rows = drafts.map((d) => ({
        uid: d.uid,
        to: d.from.length > 30 ? d.from.slice(0, 27) + '...' : d.from,
        subject: d.subject.length > 50 ? d.subject.slice(0, 47) + '...' : d.subject,
        date: d.date,
      }));
      ctx.formatter.printTable(rows);
    }
  } finally {
    await imap.disconnect();
  }
}
