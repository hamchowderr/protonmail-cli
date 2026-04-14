import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailDownloadOptions {
  output?: string;
  mailbox?: string;
}

export async function runMailDownload(
  ctx: CommandContext,
  id: string,
  index: number,
  opts: MailDownloadOptions,
): Promise<void> {
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
    const attachment = await imap.downloadAttachment(mailbox, id, index);

    if (!attachment.data) {
      throw new Error('No attachment data received');
    }

    const outputPath = resolve(opts.output ?? attachment.filename);
    await writeFile(outputPath, attachment.data);

    if (ctx.formatter.isJSON) {
      ctx.formatter.printJSON({
        success: true,
        filename: attachment.filename,
        size: attachment.size,
        content_type: attachment.content_type,
        path: outputPath,
      });
    } else {
      ctx.formatter.printSuccess(`Downloaded ${attachment.filename} (${attachment.size}b) to ${outputPath}`);
    }
  } finally {
    await imap.disconnect();
  }
}
