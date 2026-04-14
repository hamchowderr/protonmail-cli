import type { CommandContext } from '../../context.js';
import { ImapClient } from '../../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../../config/keyring.js';
import type { DraftMessage } from '../../../imap/types.js';

export interface DraftCreateOptions {
  to: string[];
  cc?: string[];
  subject: string;
  body?: string;
  attach?: string[];
}

export async function runDraftCreate(ctx: CommandContext, opts: DraftCreateOptions): Promise<void> {
  const pw = await getPassword(KEYRING_SERVICE, ctx.config.bridge.email);
  if (!pw) throw new Error('No password found in keyring. Run "config init" first.');

  const imap = new ImapClient({
    host: ctx.config.bridge.imap_host,
    port: ctx.config.bridge.imap_port,
    email: ctx.config.bridge.email,
    password: pw,
  });

  let body = opts.body ?? '';
  if (!body && !process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    body = Buffer.concat(chunks).toString('utf-8');
  }

  const draft: DraftMessage = {
    to: opts.to,
    cc: opts.cc,
    subject: opts.subject,
    body,
    attachments: opts.attach,
  };

  await imap.connect();
  try {
    const uid = await imap.saveDraft(draft);

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON({ success: true, uid });
    } else {
      ctx.formatter.printSuccess(`Draft created (uid: ${uid})`);
    }
  } finally {
    await imap.disconnect();
  }
}
