import type { Command } from 'commander';
import type { GlobalOptions } from '../../context.js';
import { makeContext } from '../../context.js';
import { runDraftList } from './list.js';
import { runDraftCreate } from './create.js';
import { runDraftEdit } from './edit.js';
import { runDraftDelete } from './delete.js';

export function registerDraftCommands(
  mailCmd: Command,
  getGlobals: (prog: Command) => GlobalOptions,
): void {
  const draft = mailCmd
    .command('draft')
    .description('Manage drafts');

  draft
    .command('list')
    .description('List drafts')
    .option('-n, --limit <number>', 'Max number of drafts', parseInt)
    .action(async (opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!.parent!);
      const ctx = await makeContext(globals);
      await runDraftList(ctx, { limit: opts.limit });
    });

  draft
    .command('create')
    .description('Create a draft')
    .requiredOption('-t, --to <address...>', 'Recipient(s)')
    .option('--cc <address...>', 'CC recipient(s)')
    .requiredOption('-s, --subject <subject>', 'Subject')
    .option('-b, --body <text>', 'Body text')
    .option('-a, --attach <file...>', 'Attachment file(s)')
    .action(async (opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!.parent!);
      const ctx = await makeContext(globals);
      await runDraftCreate(ctx, {
        to: opts.to,
        cc: opts.cc,
        subject: opts.subject,
        body: opts.body,
        attach: opts.attach,
      });
    });

  draft
    .command('edit')
    .description('Edit a draft')
    .argument('<id>', 'Draft ID (uid:123 or sequence number)')
    .option('-t, --to <address...>', 'Recipient(s)')
    .option('--cc <address...>', 'CC recipient(s)')
    .option('-s, --subject <subject>', 'Subject')
    .option('-b, --body <text>', 'Body text')
    .option('-a, --attach <file...>', 'Attachment file(s)')
    .action(async (id: string, opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!.parent!);
      const ctx = await makeContext(globals);
      await runDraftEdit(ctx, id, {
        to: opts.to,
        cc: opts.cc,
        subject: opts.subject,
        body: opts.body,
        attach: opts.attach,
      });
    });

  draft
    .command('delete')
    .description('Delete drafts')
    .argument('<ids...>', 'Draft ID(s)')
    .action(async (ids: string[], _opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!.parent!);
      const ctx = await makeContext(globals);
      await runDraftDelete(ctx, ids);
    });
}
