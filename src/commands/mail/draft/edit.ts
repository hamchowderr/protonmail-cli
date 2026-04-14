import type { CommandContext } from '../../context.js';
import { ImapClient } from '../../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../../config/keyring.js';
import type { DraftMessage } from '../../../imap/types.js';

export interface DraftEditOptions {
  to?: string[];
  cc?: string[];
  subject?: string;
  body?: string;
  attach?: string[];
}

export async function runDraftEdit(ctx: CommandContext, id: string, opts: DraftEditOptions): Promise<void> {
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
    // Fetch existing draft
    const existing = await imap.getMessage('Drafts', id);

    // Merge with new values
    const draft: DraftMessage = {
      to: opts.to ?? existing.to,
      cc: opts.cc ?? (existing.cc.length ? existing.cc : undefined),
      subject: opts.subject ?? existing.subject,
      body: opts.body ?? existing.text_body,
      attachments: opts.attach,
    };

    // Delete old draft and save new one
    await imap.deleteDraft(id);
    const uid = await imap.saveDraft(draft);

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON({ success: true, uid });
    } else {
      ctx.formatter.printSuccess(`Draft updated (uid: ${uid})`);
    }
  } finally {
    await imap.disconnect();
  }
}
