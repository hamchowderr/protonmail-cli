import type { Config } from '../config/types.js';
import { Formatter } from '../output/formatter.js';
import { loadConfig, configExists } from '../config/config.js';
import { defaultConfig } from '../config/types.js';

export interface GlobalOptions {
  json: boolean;
  verbose: boolean;
  quiet: boolean;
  noColor: boolean;
  config?: string;
}

export interface CommandContext {
  config: Config;
  formatter: Formatter;
  globals: GlobalOptions;
}

export async function makeContext(globals: GlobalOptions): Promise<CommandContext> {
  let config: Config;

  if (globals.config) {
    config = await loadConfig(globals.config);
  } else if (configExists()) {
    config = await loadConfig();
  } else {
    config = defaultConfig();
  }

  const formatter = new Formatter({
    json: globals.json,
    verbose: globals.verbose,
    quiet: globals.quiet,
    noColor: globals.noColor,
  });

  return { config, formatter, globals };
}
