import { Chalk, type ChalkInstance } from 'chalk';
import columnify from 'columnify';

export interface FormatterOptions {
  json: boolean;
  verbose: boolean;
  quiet: boolean;
  noColor: boolean;
}

export class Formatter {
  private opts: FormatterOptions;
  private chalk: ChalkInstance;

  constructor(opts: FormatterOptions) {
    const forceNoColor = opts.noColor || opts.json;
    this.opts = opts;
    this.chalk = forceNoColor ? new Chalk({ level: 0 }) : new Chalk();
  }

  printJSON(value: unknown): void {
    process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  }

  printError(err: Error | string): void {
    const message = err instanceof Error ? err.message : err;
    if (this.opts.json) {
      this.printJSON({ success: false, error: message });
    } else {
      process.stderr.write(this.chalk.red(`Error: ${message}`) + '\n');
    }
  }

  printSuccess(message: string): void {
    if (this.opts.quiet) return;
    if (this.opts.json) {
      this.printJSON({ success: true, message });
    } else {
      process.stdout.write(this.chalk.green(`\u2714 ${message}`) + '\n');
    }
  }

  printWarning(message: string): void {
    if (this.opts.quiet) return;
    process.stderr.write(this.chalk.yellow(`Warning: ${message}`) + '\n');
  }

  verbose(message: string): void {
    if (!this.opts.verbose || this.opts.quiet) return;
    process.stderr.write(this.chalk.gray(message) + '\n');
  }

  printTable(data: Record<string, unknown>[], options?: columnify.GlobalOptions): void {
    if (this.opts.json) {
      this.printJSON(data);
      return;
    }
    process.stdout.write(columnify(data, options) + '\n');
  }

  printList(items: string[]): void {
    if (this.opts.json) {
      this.printJSON(items);
      return;
    }
    for (let i = 0; i < items.length; i++) {
      process.stdout.write(`${i + 1}. ${items[i]}\n`);
    }
  }

  get isJSON(): boolean {
    return this.opts.json;
  }

  get ch(): ChalkInstance {
    return this.chalk;
  }
}
