import { Command } from 'commander';
import type { GlobalOptions } from '../context.js';
import { makeContext } from '../context.js';
import { runMailList } from './list.js';
import { runMailRead } from './read.js';
import { runMailSend } from './send.js';
import { runMailReply } from './reply.js';
import { runMailForward } from './forward.js';
import { runMailDelete } from './delete.js';
import { runMailMove } from './move.js';
import { runMailArchive } from './archive.js';
import { runMailFlag } from './flag.js';
import { runMailSearch } from './search.js';
import { runMailWatch } from './watch.js';
import { runMailThread } from './thread.js';
import { runMailSummarize } from './summarize.js';
import { runMailExtract } from './extract.js';
import { runMailDownload } from './download.js';
import { registerDraftCommands } from './draft/index.js';

export function registerMailCommands(
  program: Command,
  getGlobals: (prog: Command) => GlobalOptions,
): void {
  const mail = program
    .command('mail')
    .description('Email operations');

  mail
    .command('list')
    .description('List messages')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .option('-n, --limit <number>', 'Max messages', parseInt)
    .option('--offset <number>', 'Skip messages', parseInt)
    .option('-p, --page <number>', 'Page number', parseInt)
    .option('--unread', 'Only unread messages')
    .action(async (opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailList(ctx, {
        mailbox: opts.mailbox,
        limit: opts.limit,
        offset: opts.offset,
        page: opts.page,
        unread: opts.unread,
      });
    });

  mail
    .command('read')
    .description('Read a message')
    .argument('<id>', 'Message ID (uid:123 or sequence number)')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .option('--raw', 'Show raw content')
    .option('--headers', 'Show headers only')
    .option('--html', 'Show HTML body')
    .action(async (id: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailRead(ctx, id, {
        mailbox: opts.mailbox,
        raw: opts.raw,
        headers: opts.headers,
        html: opts.html,
      });
    });

  mail
    .command('send')
    .description('Send an email')
    .requiredOption('-t, --to <address...>', 'Recipient(s)')
    .option('--cc <address...>', 'CC recipient(s)')
    .option('--bcc <address...>', 'BCC recipient(s)')
    .requiredOption('-s, --subject <subject>', 'Subject')
    .option('-b, --body <text>', 'Body text')
    .option('-a, --attach <file...>', 'Attachment file(s)')
    .option('--idempotency-key <key>', 'Idempotency key')
    .action(async (opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailSend(ctx, {
        to: opts.to,
        cc: opts.cc,
        bcc: opts.bcc,
        subject: opts.subject,
        body: opts.body,
        attach: opts.attach,
        idempotencyKey: opts.idempotencyKey,
      });
    });

  mail
    .command('reply')
    .description('Reply to a message')
    .argument('<id>', 'Message ID to reply to')
    .option('--all', 'Reply to all recipients')
    .option('-b, --body <text>', 'Reply body')
    .option('-a, --attach <file...>', 'Attachment file(s)')
    .option('--idempotency-key <key>', 'Idempotency key')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .action(async (id: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailReply(ctx, id, {
        all: opts.all,
        body: opts.body,
        attach: opts.attach,
        idempotencyKey: opts.idempotencyKey,
        mailbox: opts.mailbox,
      });
    });

  mail
    .command('forward')
    .description('Forward a message')
    .argument('<id>', 'Message ID to forward')
    .requiredOption('-t, --to <address...>', 'Forward to')
    .option('-b, --body <text>', 'Additional body text')
    .option('-a, --attach <file...>', 'Attachment file(s)')
    .option('--idempotency-key <key>', 'Idempotency key')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .action(async (id: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailForward(ctx, id, {
        to: opts.to,
        body: opts.body,
        attach: opts.attach,
        idempotencyKey: opts.idempotencyKey,
        mailbox: opts.mailbox,
      });
    });

  mail
    .command('delete')
    .description('Delete messages')
    .argument('<ids...>', 'Message ID(s)')
    .option('--permanent', 'Permanently delete')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .action(async (ids: string[], opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailDelete(ctx, ids, {
        permanent: opts.permanent,
        mailbox: opts.mailbox,
      });
    });

  mail
    .command('move')
    .description('Move a message')
    .argument('<id>', 'Message ID')
    .argument('<mailbox>', 'Destination mailbox')
    .option('-m, --mailbox <name>', 'Source mailbox')
    .action(async (id: string, destination: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailMove(ctx, id, destination, { mailbox: opts.mailbox });
    });

  mail
    .command('archive')
    .description('Archive messages')
    .argument('<ids...>', 'Message ID(s)')
    .option('-m, --mailbox <name>', 'Source mailbox')
    .action(async (ids: string[], opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailArchive(ctx, ids, { mailbox: opts.mailbox });
    });

  mail
    .command('flag')
    .description('Set message flags')
    .argument('<id>', 'Message ID')
    .option('--read', 'Mark as read')
    .option('--unread', 'Mark as unread')
    .option('--star', 'Star message')
    .option('--unstar', 'Remove star')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .action(async (id: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailFlag(ctx, id, {
        read: opts.read,
        unread: opts.unread,
        star: opts.star,
        unstar: opts.unstar,
        mailbox: opts.mailbox,
      });
    });

  mail
    .command('search')
    .description('Search messages')
    .argument('<query>', 'Search query')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .option('--from <address>', 'From address')
    .option('--subject <text>', 'Subject contains')
    .option('--since <date>', 'Since date')
    .option('--before <date>', 'Before date')
    .action(async (query: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailSearch(ctx, query, {
        mailbox: opts.mailbox,
        from: opts.from,
        subject: opts.subject,
        since: opts.since,
        before: opts.before,
      });
    });

  mail
    .command('watch')
    .description('Watch for new messages')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .option('-i, --interval <seconds>', 'Poll interval', parseInt)
    .option('--unread', 'Only unread messages')
    .option('-e, --exec <cmd>', 'Execute command for each new message ({} = uid)')
    .option('--once', 'Poll once and exit')
    .action(async (opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailWatch(ctx, {
        mailbox: opts.mailbox,
        interval: opts.interval,
        unread: opts.unread,
        exec: opts.exec,
        once: opts.once,
      });
    });

  mail
    .command('thread')
    .description('Show conversation thread')
    .argument('<id>', 'Message ID')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .action(async (id: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailThread(ctx, id, { mailbox: opts.mailbox });
    });

  mail
    .command('summarize')
    .description('Summarize a message')
    .argument('<id>', 'Message ID')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .action(async (id: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailSummarize(ctx, id, { mailbox: opts.mailbox });
    });

  mail
    .command('extract')
    .description('Extract structured data from message')
    .argument('<id>', 'Message ID')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .action(async (id: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailExtract(ctx, id, { mailbox: opts.mailbox });
    });

  mail
    .command('download')
    .description('Download an attachment')
    .argument('<id>', 'Message ID')
    .argument('<index>', 'Attachment index', parseInt)
    .option('-o, --output <path>', 'Output file path')
    .option('-m, --mailbox <name>', 'Mailbox name')
    .action(async (id: string, index: number, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      await runMailDownload(ctx, id, index, {
        output: opts.output,
        mailbox: opts.mailbox,
      });
    });

  registerDraftCommands(mail, getGlobals);
}
