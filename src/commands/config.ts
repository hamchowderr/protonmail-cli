import net from 'node:net';
import { Command } from 'commander';
import { input, password as passwordPrompt } from '@inquirer/prompts';
import type { GlobalOptions } from './context.js';
import { makeContext } from './context.js';
import { loadConfig, saveConfig, configPath, configExists } from '../config/config.js';
import { defaultConfig } from '../config/types.js';
import type { Config } from '../config/types.js';
import { getPassword, setPassword, KEYRING_SERVICE } from '../config/keyring.js';
import { ImapClient } from '../imap/client.js';
import { SmtpClient } from '../smtp/client.js';

export function registerConfigCommands(
  program: Command,
  getGlobals: (prog: Command) => GlobalOptions,
): void {
  const config = program
    .command('config')
    .description('Manage configuration');

  config
    .command('init')
    .description('Interactive setup wizard')
    .action(async (_opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      const defaults = defaultConfig();

      const email = await input({
        message: 'ProtonMail email address:',
        default: ctx.config.bridge.email || undefined,
      });

      const imapHost = await input({
        message: 'IMAP host:',
        default: ctx.config.bridge.imap_host || defaults.bridge.imap_host,
      });

      const imapPort = await input({
        message: 'IMAP port:',
        default: String(ctx.config.bridge.imap_port || defaults.bridge.imap_port),
      });

      const smtpHost = await input({
        message: 'SMTP host:',
        default: ctx.config.bridge.smtp_host || defaults.bridge.smtp_host,
      });

      const smtpPort = await input({
        message: 'SMTP port:',
        default: String(ctx.config.bridge.smtp_port || defaults.bridge.smtp_port),
      });

      const bridgePassword = await passwordPrompt({
        message: 'Bridge password:',
      });

      const cfg: Config = {
        bridge: {
          email,
          imap_host: imapHost,
          imap_port: parseInt(imapPort, 10),
          smtp_host: smtpHost,
          smtp_port: parseInt(smtpPort, 10),
        },
        defaults: ctx.config.defaults,
      };

      await saveConfig(cfg, globals.config);
      await setPassword(bridgePassword, KEYRING_SERVICE, email);

      ctx.formatter.printSuccess(`Config saved to ${configPath()}`);
      ctx.formatter.printSuccess('Password stored in system keyring');
    });

  config
    .command('show')
    .description('Display current configuration')
    .action(async (_opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);

      if (ctx.formatter.isJSON) {
        ctx.formatter.printJSON(ctx.config);
      } else {
        const lines = [
          `Config file: ${configPath()}`,
          '',
          'Bridge:',
          `  Email:     ${ctx.config.bridge.email || '(not set)'}`,
          `  IMAP host: ${ctx.config.bridge.imap_host}`,
          `  IMAP port: ${ctx.config.bridge.imap_port}`,
          `  SMTP host: ${ctx.config.bridge.smtp_host}`,
          `  SMTP port: ${ctx.config.bridge.smtp_port}`,
          '',
          'Defaults:',
          `  Mailbox: ${ctx.config.defaults.mailbox}`,
          `  Limit:   ${ctx.config.defaults.limit}`,
          `  Format:  ${ctx.config.defaults.format}`,
        ];
        process.stdout.write(lines.join('\n') + '\n');
      }
    });

  config
    .command('set')
    .description('Set a config value (dot notation)')
    .argument('<key>', 'Config key (e.g., bridge.email, defaults.limit)')
    .argument('<value>', 'Value to set')
    .action(async (key: string, value: string, _opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);
      const cfg = structuredClone(ctx.config);

      const parts = key.split('.');
      if (parts.length !== 2) {
        ctx.formatter.printError('Key must be in dot notation (e.g., bridge.email)');
        process.exit(1);
      }

      const [section, field] = parts as [string, string];
      if (section !== 'bridge' && section !== 'defaults') {
        ctx.formatter.printError(`Unknown config section: ${section}`);
        process.exit(1);
      }

      const sectionObj = cfg[section] as unknown as Record<string, unknown>;
      if (!(field in sectionObj)) {
        ctx.formatter.printError(`Unknown config key: ${key}`);
        process.exit(1);
      }

      // Coerce numbers
      const current = sectionObj[field];
      if (typeof current === 'number') {
        sectionObj[field] = parseInt(value, 10);
      } else {
        sectionObj[field] = value;
      }

      await saveConfig(cfg, globals.config);
      ctx.formatter.printSuccess(`Set ${key} = ${value}`);
    });

  config
    .command('validate')
    .description('Test IMAP connectivity')
    .action(async (_opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);

      const pw = await getPassword(KEYRING_SERVICE, ctx.config.bridge.email);
      if (!pw) {
        ctx.formatter.printError('No password found in keyring. Run "config init" first.');
        process.exit(1);
      }

      const imap = new ImapClient({
        host: ctx.config.bridge.imap_host,
        port: ctx.config.bridge.imap_port,
        email: ctx.config.bridge.email,
        password: pw,
      });

      try {
        await imap.connect();
        await imap.disconnect();
        ctx.formatter.printSuccess('IMAP connection successful');
      } catch (err) {
        ctx.formatter.printError(err instanceof Error ? err : String(err));
        process.exit(1);
      }
    });

  config
    .command('doctor')
    .description('Run diagnostic checks')
    .action(async (_opts, cmd) => {
      const globals = getGlobals(cmd.parent!.parent!);
      const ctx = await makeContext(globals);

      const checks: Array<{ name: string; status: 'pass' | 'fail'; detail?: string }> = [];

      // 1. Config file exists
      const exists = configExists();
      checks.push({
        name: 'Config file exists',
        status: exists ? 'pass' : 'fail',
        detail: exists ? configPath() : 'Run "config init" to create',
      });

      // 2. Config YAML parses
      let cfg: Config | null = null;
      try {
        cfg = await loadConfig(globals.config);
        checks.push({ name: 'Config YAML parses', status: 'pass' });
      } catch (err) {
        checks.push({
          name: 'Config YAML parses',
          status: 'fail',
          detail: err instanceof Error ? err.message : String(err),
        });
      }

      if (!cfg) cfg = defaultConfig();

      // 3. Email is set
      checks.push({
        name: 'Email is set',
        status: cfg.bridge.email ? 'pass' : 'fail',
        detail: cfg.bridge.email || 'No email configured',
      });

      // 4. Password in keyring
      const pw = await getPassword(KEYRING_SERVICE, cfg.bridge.email || undefined);
      checks.push({
        name: 'Password in keyring',
        status: pw ? 'pass' : 'fail',
        detail: pw ? 'Found' : 'Not found',
      });

      // 5. IMAP port reachable
      const imapReachable = await checkPort(cfg.bridge.imap_host, cfg.bridge.imap_port);
      checks.push({
        name: 'IMAP port reachable',
        status: imapReachable ? 'pass' : 'fail',
        detail: `${cfg.bridge.imap_host}:${cfg.bridge.imap_port}`,
      });

      // 6. SMTP port reachable
      const smtpReachable = await checkPort(cfg.bridge.smtp_host, cfg.bridge.smtp_port);
      checks.push({
        name: 'SMTP port reachable',
        status: smtpReachable ? 'pass' : 'fail',
        detail: `${cfg.bridge.smtp_host}:${cfg.bridge.smtp_port}`,
      });

      // 7. IMAP auth succeeds
      if (imapReachable && pw && cfg.bridge.email) {
        try {
          const imap = new ImapClient({
            host: cfg.bridge.imap_host,
            port: cfg.bridge.imap_port,
            email: cfg.bridge.email,
            password: pw,
          });
          await imap.connect();
          await imap.disconnect();
          checks.push({ name: 'IMAP auth succeeds', status: 'pass' });
        } catch (err) {
          checks.push({
            name: 'IMAP auth succeeds',
            status: 'fail',
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        checks.push({ name: 'IMAP auth succeeds', status: 'fail', detail: 'Skipped (prerequisites failed)' });
      }

      // 8. SMTP auth succeeds
      if (smtpReachable && pw && cfg.bridge.email) {
        try {
          const smtp = new SmtpClient({
            host: cfg.bridge.smtp_host,
            port: cfg.bridge.smtp_port,
            email: cfg.bridge.email,
            password: pw,
          });
          await smtp.verify();
          checks.push({ name: 'SMTP auth succeeds', status: 'pass' });
        } catch (err) {
          checks.push({
            name: 'SMTP auth succeeds',
            status: 'fail',
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        checks.push({ name: 'SMTP auth succeeds', status: 'fail', detail: 'Skipped (prerequisites failed)' });
      }

      if (ctx.formatter.isJSON) {
        ctx.formatter.printJSON(checks);
      } else {
        for (const check of checks) {
          const icon = check.status === 'pass' ? ctx.formatter.ch.green('\u2714') : ctx.formatter.ch.red('\u2718');
          const detail = check.detail ? ctx.formatter.ch.gray(` (${check.detail})`) : '';
          process.stdout.write(`${icon} ${check.name}${detail}\n`);
        }
        const passed = checks.filter((c) => c.status === 'pass').length;
        process.stdout.write(`\n${passed}/${checks.length} checks passed\n`);
      }
    });
}

function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 3000 });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}
