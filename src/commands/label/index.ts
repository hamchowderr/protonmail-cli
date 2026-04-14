import type { Command } from 'commander';
import type { GlobalOptions } from '../context.js';
import { makeContext } from '../context.js';
import { runLabelList } from './list.js';
import { runLabelAdd } from './add.js';
import { runLabelRemove } from './remove.js';

export function registerLabelCommands(
  mailCmd: Command,
  getGlobals: (p: Command) => GlobalOptions,
  program: Command,
): void {
  const label = mailCmd.command('label').description('Manage message labels');

  label
    .command('list')
    .description('List all labels')
    .action(async () => {
      const ctx = await makeContext(getGlobals(program));
      await runLabelList(ctx);
    });

  label
    .command('add')
    .description('Add a label to messages')
    .argument('<ids...>', 'Message IDs or UIDs')
    .requiredOption('-l, --label <name>', 'Label name')
    .option('-m, --mailbox <mailbox>', 'Source mailbox')
    .action(async (ids: string[], opts: { label: string; mailbox?: string }) => {
      const ctx = await makeContext(getGlobals(program));
      await runLabelAdd(ctx, ids, opts);
    });

  label
    .command('remove')
    .description('Remove a label from messages')
    .argument('<ids...>', 'Message IDs or UIDs')
    .requiredOption('-l, --label <name>', 'Label name')
    .action(async (ids: string[], opts: { label: string }) => {
      const ctx = await makeContext(getGlobals(program));
      await runLabelRemove(ctx, ids, opts);
    });
}
