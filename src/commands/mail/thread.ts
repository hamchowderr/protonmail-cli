import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailThreadOptions {
  mailbox?: string;
}

export async function runMailThread(ctx: CommandContext, id: string, opts: MailThreadOptions): Promise<void> {
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
    const thread = await imap.getThread(mailbox, id);

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON(thread);
      return;
    }

    const ch = ctx.formatter.ch;
    process.stdout.write(ch.bold(`Thread: ${thread[0]?.subject ?? '(no subject)'} (${thread.length} messages)`) + '\n\n');

    for (const msg of thread) {
      process.stdout.write(ch.bold(`[${msg.uid}] ${msg.from}`) + '\n');
      process.stdout.write(ch.gray(`  ${msg.date}`) + '\n');
      const preview = msg.text_body.slice(0, 200).replace(/\n/g, ' ');
      process.stdout.write(`  ${preview}${msg.text_body.length > 200 ? '...' : ''}\n\n`);
    }
  } finally {
    await imap.disconnect();
  }
}
