import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailReadOptions {
  mailbox?: string;
  raw?: boolean;
  headers?: boolean;
  html?: boolean;
}

export async function runMailRead(ctx: CommandContext, id: string, opts: MailReadOptions): Promise<void> {
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
    const msg = await imap.getMessage(mailbox, id);

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON(msg);
      return;
    }

    if (opts.headers) {
      process.stdout.write(`From:       ${msg.from}\n`);
      process.stdout.write(`To:         ${msg.to.join(', ')}\n`);
      if (msg.cc.length) process.stdout.write(`Cc:         ${msg.cc.join(', ')}\n`);
      process.stdout.write(`Subject:    ${msg.subject}\n`);
      process.stdout.write(`Date:       ${msg.date}\n`);
      process.stdout.write(`Message-ID: ${msg.message_id}\n`);
      if (msg.in_reply_to) process.stdout.write(`In-Reply-To: ${msg.in_reply_to}\n`);
      process.stdout.write(`Flags:      ${msg.flags.join(', ')}\n`);
      if (msg.attachments.length) {
        process.stdout.write(`Attachments: ${msg.attachments.map((a) => `${a.filename} (${a.size}b)`).join(', ')}\n`);
      }
      return;
    }

    // Full display
    const ch = ctx.formatter.ch;
    process.stdout.write(ch.bold(`From: ${msg.from}`) + '\n');
    process.stdout.write(`To: ${msg.to.join(', ')}\n`);
    if (msg.cc.length) process.stdout.write(`Cc: ${msg.cc.join(', ')}\n`);
    process.stdout.write(ch.bold(`Subject: ${msg.subject}`) + '\n');
    process.stdout.write(ch.gray(`Date: ${msg.date}`) + '\n');
    process.stdout.write(ch.gray('---') + '\n');

    if (opts.html && msg.html_body) {
      process.stdout.write(msg.html_body + '\n');
    } else if (opts.raw) {
      process.stdout.write(msg.html_body || msg.text_body || '(no body)\n');
    } else {
      process.stdout.write((msg.text_body || '(no body)') + '\n');
    }

    if (msg.attachments.length) {
      process.stdout.write('\n' + ch.gray('Attachments:') + '\n');
      for (const att of msg.attachments) {
        process.stdout.write(`  [${att.index}] ${att.filename} (${att.content_type}, ${att.size}b)\n`);
      }
    }
  } finally {
    await imap.disconnect();
  }
}
