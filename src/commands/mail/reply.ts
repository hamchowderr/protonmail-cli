import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { SmtpClient } from '../../smtp/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';
import { checkIdempotencyKey, recordIdempotencyKey } from '../../config/idempotency.js';

export interface MailReplyOptions {
  all?: boolean;
  body?: string;
  attach?: string[];
  idempotencyKey?: string;
  mailbox?: string;
}

export async function runMailReply(ctx: CommandContext, id: string, opts: MailReplyOptions): Promise<void> {
  if (opts.idempotencyKey) {
    const exists = await checkIdempotencyKey(opts.idempotencyKey);
    if (exists) {
      ctx.formatter.printWarning(`Reply already sent with idempotency key: ${opts.idempotencyKey}`);
      return;
    }
  }

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
  let original;
  try {
    original = await imap.getMessage(mailbox, id);
  } finally {
    await imap.disconnect();
  }

  // Build reply recipients
  const to: string[] = [original.from];
  const cc: string[] = [];

  if (opts.all) {
    // Add original To and Cc, excluding our own address
    const self = ctx.config.bridge.email.toLowerCase();
    for (const addr of [...original.to, ...original.cc]) {
      const email = addr.toLowerCase();
      if (!email.includes(self) && !to.some((t) => t.toLowerCase().includes(email))) {
        cc.push(addr);
      }
    }
  }

  // Build references chain
  const refs = [...original.references];
  if (original.message_id && !refs.includes(original.message_id)) {
    refs.push(original.message_id);
  }

  let body = opts.body ?? '';
  if (!body && !process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    body = Buffer.concat(chunks).toString('utf-8');
  }

  const attachments = opts.attach?.map((path) => ({
    filename: path.split(/[/\\]/).pop() ?? path,
    path,
  }));

  const smtp = new SmtpClient({
    host: ctx.config.bridge.smtp_host,
    port: ctx.config.bridge.smtp_port,
    email: ctx.config.bridge.email,
    password: pw,
  });

  const subject = original.subject.startsWith('Re:') ? original.subject : `Re: ${original.subject}`;

  const info = await smtp.send({
    from: ctx.config.bridge.email,
    to,
    cc: cc.length ? cc : undefined,
    subject,
    text: body,
    attachments,
    inReplyTo: original.message_id,
    references: refs.join(' '),
  });

  if (opts.idempotencyKey) {
    await recordIdempotencyKey(opts.idempotencyKey);
  }

  if (ctx.formatter.isJSON) {
    ctx.formatter.printJSON(info);
  } else {
    ctx.formatter.printSuccess(`Reply sent (${info.messageId})`);
  }
}
