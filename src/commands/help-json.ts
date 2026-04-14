import type { Command, Argument, Option } from 'commander';

interface CommandSchema {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    required: boolean;
    variadic: boolean;
    description?: string;
  }>;
  options?: Array<{
    flags: string;
    description: string;
    required: boolean;
    default?: unknown;
  }>;
  subcommands?: CommandSchema[];
}

function commandToSchema(cmd: Command): CommandSchema {
  const schema: CommandSchema = {
    name: cmd.name(),
    description: cmd.description(),
  };

  const args = (cmd as unknown as { registeredArguments: Argument[] }).registeredArguments;
  if (args?.length) {
    schema.arguments = args.map((arg) => ({
      name: arg.name(),
      required: arg.required,
      variadic: arg.variadic,
      description: arg.description || undefined,
    }));
  }

  const opts = cmd.options as Option[];
  if (opts?.length) {
    schema.options = opts.map((opt) => {
      const entry: { flags: string; description: string; required: boolean; default?: unknown } = {
        flags: opt.flags,
        description: opt.description,
        required: opt.required,
      };
      if (opt.defaultValue !== undefined) {
        entry.default = opt.defaultValue;
      }
      return entry;
    });
  }

  const subs = cmd.commands as Command[];
  if (subs?.length) {
    schema.subcommands = subs.map(commandToSchema);
  }

  return schema;
}

export function printHelpJSON(program: Command): void {
  const schema = commandToSchema(program);
  process.stdout.write(JSON.stringify(schema, null, 2) + '\n');
}
