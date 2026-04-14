import type { Command } from 'commander';
import type { GlobalOptions } from './context.js';
import { makeContext } from './context.js';

const VERSION = '0.1.0';

export function registerVersionCommand(
  program: Command,
  getGlobals: (p: Command) => GlobalOptions,
): void {
  program
    .command('version')
    .description('Show version information')
    .action(async () => {
      const ctx = await makeContext(getGlobals(program));

      if (ctx.formatter.isJSON) {
        ctx.formatter.printJSON({
          version: VERSION,
          node: process.version,
          platform: process.platform,
        });
      } else {
        process.stdout.write(`protonmail-cli v${VERSION}\n`);
      }
    });
}
