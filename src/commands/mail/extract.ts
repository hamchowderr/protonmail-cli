import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailExtractOptions {
  mailbox?: string;
}

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w{2,}/g;
const URL_RE = /https?:\/\/\S+/g;
const DATE_RE = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4}\b/gi;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

export async function runMailExtract(ctx: CommandContext, id: string, opts: MailExtractOptions): Promise<void> {
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
    const body = msg.text_body || '';

    const emails = [...new Set(body.match(EMAIL_RE) ?? [])];
    const urls = [...new Set(body.match(URL_RE) ?? [])];
    const dates = [...new Set(body.match(DATE_RE) ?? [])];
    const phones = [...new Set(body.match(PHONE_RE) ?? [])];

    const extracted = { emails, urls, dates, phones };

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON(extracted);
      return;
    }

    const ch = ctx.formatter.ch;

    if (emails.length) {
      process.stdout.write(ch.bold('Emails:') + '\n');
      for (const e of emails) process.stdout.write(`  ${e}\n`);
    }
    if (urls.length) {
      process.stdout.write(ch.bold('URLs:') + '\n');
      for (const u of urls) process.stdout.write(`  ${u}\n`);
    }
    if (dates.length) {
      process.stdout.write(ch.bold('Dates:') + '\n');
      for (const d of dates) process.stdout.write(`  ${d}\n`);
    }
    if (phones.length) {
      process.stdout.write(ch.bold('Phone numbers:') + '\n');
      for (const p of phones) process.stdout.write(`  ${p}\n`);
    }

    if (!emails.length && !urls.length && !dates.length && !phones.length) {
      ctx.formatter.printSuccess('No structured data found');
    }
  } finally {
    await imap.disconnect();
  }
}
