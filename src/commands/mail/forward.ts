import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { SmtpClient } from '../../smtp/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';
import { checkIdempotencyKey, recordIdempotencyKey } from '../../config/idempotency.js';

export interface MailForwardOptions {
  to: string[];
  body?: string;
  attach?: string[];
  idempotencyKey?: string;
  mailbox?: string;
}

export async function runMailForward(ctx: CommandContext, id: string, opts: MailForwardOptions): Promise<void> {
  if (opts.idempotencyKey) {
    const exists = await checkIdempotencyKey(opts.idempotencyKey);
    if (exists) {
      ctx.formatter.printWarning(`Forward already sent with idempotency key: ${opts.idempotencyKey}`);
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

  const subject = original.subject.startsWith('Fwd:') ? original.subject : `Fwd: ${original.subject}`;

  const forwardBody = [
    opts.body ?? '',
    '',
    '---------- Forwarded message ----------',
    `From: ${original.from}`,
    `Date: ${original.date}`,
    `Subject: ${original.subject}`,
    `To: ${original.to.join(', ')}`,
    '',
    original.text_body,
  ].join('\n');

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

  const info = await smtp.send({
    from: ctx.config.bridge.email,
    to: opts.to,
    subject,
    text: forwardBody,
    attachments,
  });

  if (opts.idempotencyKey) {
    await recordIdempotencyKey(opts.idempotencyKey);
  }

  if (ctx.formatter.isJSON) {
    ctx.formatter.printJSON(info);
  } else {
    ctx.formatter.printSuccess(`Forwarded (${info.messageId})`);
  }
}
