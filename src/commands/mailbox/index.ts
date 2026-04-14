import type { Command } from 'commander';
import type { GlobalOptions } from '../context.js';
import { makeContext } from '../context.js';
import { runMailboxList } from './list.js';
import { runMailboxCreate } from './create.js';
import { runMailboxDelete } from './delete.js';

export function registerMailboxCommands(
  program: Command,
  getGlobals: (p: Command) => GlobalOptions,
): void {
  const mailbox = program.command('mailbox').description('Manage mailboxes');

  mailbox
    .command('list')
    .description('List all mailboxes')
    .action(async () => {
      const ctx = await makeContext(getGlobals(program));
      await runMailboxList(ctx);
    });

  mailbox
    .command('create')
    .description('Create a mailbox')
    .argument('<name>', 'Mailbox name')
    .action(async (name: string) => {
      const ctx = await makeContext(getGlobals(program));
      await runMailboxCreate(ctx, name);
    });

  mailbox
    .command('delete')
    .description('Delete a mailbox')
    .argument('<name>', 'Mailbox name')
    .action(async (name: string) => {
      const ctx = await makeContext(getGlobals(program));
      await runMailboxDelete(ctx, name);
    });
}
