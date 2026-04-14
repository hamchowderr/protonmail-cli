import { exec } from 'node:child_process';
import type { CommandContext } from '../context.js';
import { ImapClient } from '../../imap/client.js';
import { getPassword, KEYRING_SERVICE } from '../../config/keyring.js';

export interface MailWatchOptions {
  mailbox?: string;
  interval?: number;
  unread?: boolean;
  exec?: string;
  once?: boolean;
}

export async function runMailWatch(ctx: CommandContext, opts: MailWatchOptions): Promise<void> {
  const mailbox = opts.mailbox ?? ctx.config.defaults.mailbox;
  const intervalSec = opts.interval ?? 30;

  const pw = await getPassword(KEYRING_SERVICE, ctx.config.bridge.email);
  if (!pw) throw new Error('No password found in keyring. Run "config init" first.');

  const clientOpts = {
    host: ctx.config.bridge.imap_host,
    port: ctx.config.bridge.imap_port,
    email: ctx.config.bridge.email,
    password: pw,
  };

  const seenUids = new Set<number>();
  let stopping = false;

  const cleanup = () => {
    stopping = true;
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  ctx.formatter.verbose(`Watching ${mailbox} every ${intervalSec}s...`);

  const poll = async () => {
    const imap = new ImapClient(clientOpts);
    await imap.connect();
    try {
      const messages = await imap.listMessages(mailbox, 50, 0, opts.unread);
      const newMessages = messages.filter((m) => !seenUids.has(m.uid));

      for (const msg of newMessages) {
        seenUids.add(msg.uid);
      }

      // Skip output on first poll (initial population)
      if (seenUids.size > newMessages.length || newMessages.length === 0) {
        for (const msg of newMessages) {
          if (ctx.formatter.isJSON) {
            ctx.formatter.printJSON(msg);
          } else {
            process.stdout.write(`New: [${msg.uid}] ${msg.from} — ${msg.subject}\n`);
          }

          if (opts.exec) {
            const command = opts.exec.replace(/\{}/g, String(msg.uid));
            exec(command, (err, stdout, stderr) => {
              if (stdout) process.stdout.write(stdout);
              if (stderr) process.stderr.write(stderr);
              if (err) ctx.formatter.verbose(`Exec error: ${err.message}`);
            });
          }
        }
      }
    } finally {
      await imap.disconnect();
    }
  };

  // Initial poll
  await poll();

  if (opts.once) return;

  // Poll loop
  while (!stopping) {
    await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
    if (stopping) break;
    try {
      await poll();
    } catch (err) {
      ctx.formatter.verbose(`Poll error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  ctx.formatter.verbose('Watch stopped');
}
