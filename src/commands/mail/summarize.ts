import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailSummarizeOptions {
  mailbox?: string;
}

const ACTION_VERBS = /^(please|kindly|can you|could you|would you|let's|let me|we need to|you need to|i need you to|make sure|ensure|confirm|send|schedule|update|review|check|create|delete|add|remove|follow up|reply|respond|forward|submit|complete|finish|approve|sign|attach)/i;

export async function runMailSummarize(ctx: CommandContext, id: string, opts: MailSummarizeOptions): Promise<void> {
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
    const words = body.split(/\s+/).filter(Boolean);
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const actionItems = lines.filter((l) => ACTION_VERBS.test(l));
    const hasUrls = /https?:\/\/\S+/.test(body);

    const summary = {
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      date: msg.date,
      date_iso: msg.date_iso,
      word_count: words.length,
      has_attachments: msg.attachments.length > 0,
      attachment_count: msg.attachments.length,
      has_urls: hasUrls,
      action_items: actionItems,
      flags: {
        seen: msg.seen,
        flagged: msg.flagged,
      },
    };

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON(summary);
      return;
    }

    const ch = ctx.formatter.ch;
    process.stdout.write(ch.bold('Summary') + '\n');
    process.stdout.write(`From:        ${summary.from}\n`);
    process.stdout.write(`To:          ${summary.to.join(', ')}\n`);
    process.stdout.write(`Subject:     ${summary.subject}\n`);
    process.stdout.write(`Date:        ${summary.date}\n`);
    process.stdout.write(`Words:       ${summary.word_count}\n`);
    process.stdout.write(`Attachments: ${summary.attachment_count}\n`);
    process.stdout.write(`Has URLs:    ${summary.has_urls ? 'yes' : 'no'}\n`);

    if (actionItems.length > 0) {
      process.stdout.write(ch.bold('\nAction Items:') + '\n');
      for (const item of actionItems) {
        process.stdout.write(`  - ${item}\n`);
      }
    }
  } finally {
    await imap.disconnect();
  }
}
