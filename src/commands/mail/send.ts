import type { CommandContext } from '../context.js';
import { SmtpClient } from '../../smtp/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';
import { checkIdempotencyKey, recordIdempotencyKey } from '../../config/idempotency.js';

export interface MailSendOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body?: string;
  attach?: string[];
  idempotencyKey?: string;
}

export async function runMailSend(ctx: CommandContext, opts: MailSendOptions): Promise<void> {
  // Check idempotency
  if (opts.idempotencyKey) {
    const exists = await checkIdempotencyKey(opts.idempotencyKey);
    if (exists) {
      ctx.formatter.printWarning(`Message already sent with idempotency key: ${opts.idempotencyKey}`);
      return;
    }
  }

  // Read body from stdin if not provided
  let body = opts.body ?? '';
  if (!body && !process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    body = Buffer.concat(chunks).toString('utf-8');
  }

  const pw = await getPassword(KEYRING_SERVICE, ctx.config.bridge.email);
  if (!pw) throw new Error('No password found in keyring. Run "config init" first.');

  const smtp = new SmtpClient({
    host: ctx.config.bridge.smtp_host,
    port: ctx.config.bridge.smtp_port,
    email: ctx.config.bridge.email,
    password: pw,
  });

  const attachments = opts.attach?.map((path) => ({
    filename: path.split(/[/\\]/).pop() ?? path,
    path,
  }));

  const info = await smtp.send({
    from: ctx.config.bridge.email,
    to: opts.to,
    cc: opts.cc,
    bcc: opts.bcc,
    subject: opts.subject,
    text: body,
    attachments,
  });

  // Record idempotency key
  if (opts.idempotencyKey) {
    await recordIdempotencyKey(opts.idempotencyKey);
  }

  if (ctx.formatter.isJSON) {
    ctx.formatter.printJSON(info);
  } else {
    ctx.formatter.printSuccess(`Message sent (${info.messageId})`);
  }
}
