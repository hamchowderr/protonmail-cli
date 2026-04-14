import { Command } from 'commander';
import type { GlobalOptions } from './commands/context.js';
import { registerConfigCommands } from './commands/config.js';
import { registerMailCommands } from './commands/mail/index.js';
import { registerMailboxCommands } from './commands/mailbox/index.js';
import { registerContactsCommands } from './commands/contacts/index.js';
import { registerVersionCommand } from './commands/version.js';
import { printHelpJSON } from './commands/help-json.js';

export const program = new Command();

program
  .name('protonmail-cli')
  .description('ProtonMail CLI via Proton Bridge IMAP/SMTP')
  .version('0.1.0')
  .option('--json', 'Output as JSON', false)
  .option('-v, --verbose', 'Verbose output', false)
  .option('-q, --quiet', 'Suppress non-essential output', false)
  .option('--no-color', 'Disable color output')
  .option('-c, --config <path>', 'Path to config file');

export function getGlobals(prog: Command): GlobalOptions {
  const opts = prog.opts();
  return {
    json: opts.json ?? false,
    verbose: opts.verbose ?? false,
    quiet: opts.quiet ?? false,
    noColor: opts.color === false,
    config: opts.config,
  };
}

registerConfigCommands(program, getGlobals);
registerMailCommands(program, getGlobals);
registerMailboxCommands(program, getGlobals);
registerContactsCommands(program, getGlobals);
registerVersionCommand(program, getGlobals);

// --help-json support: intercept before Commander parses
if (process.argv.includes('--help-json')) {
  printHelpJSON(program);
  process.exit(0);
}

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
