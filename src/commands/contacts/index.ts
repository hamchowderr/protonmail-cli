import type { Command } from 'commander';
import type { GlobalOptions } from '../context.js';
import { makeContext } from '../context.js';
import { runContactsList } from './list.js';
import { runContactsSearch } from './search.js';
import { runContactsAdd } from './add.js';
import { runContactsRemove } from './remove.js';

export function registerContactsCommands(
  program: Command,
  getGlobals: (p: Command) => GlobalOptions,
): void {
  const contacts = program.command('contacts').description('Manage contacts');

  contacts
    .command('list')
    .description('List all contacts')
    .action(async () => {
      const ctx = await makeContext(getGlobals(program));
      await runContactsList(ctx);
    });

  contacts
    .command('search')
    .description('Search contacts')
    .argument('<query>', 'Search by name or email')
    .action(async (query: string) => {
      const ctx = await makeContext(getGlobals(program));
      await runContactsSearch(ctx, query);
    });

  contacts
    .command('add')
    .description('Add a contact')
    .argument('<email>', 'Contact email address')
    .option('-n, --name <name>', 'Contact name')
    .action(async (email: string, opts: { name?: string }) => {
      const ctx = await makeContext(getGlobals(program));
      await runContactsAdd(ctx, email, opts);
    });

  contacts
    .command('remove')
    .description('Remove a contact')
    .argument('<email>', 'Contact email address')
    .action(async (email: string) => {
      const ctx = await makeContext(getGlobals(program));
      await runContactsRemove(ctx, email);
    });
}
