import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { configDir, configPath, loadConfig, saveConfig, configExists } from '../../src/config/config.js';
import { APP_NAME, defaultConfig } from '../../src/config/types.js';

describe('configDir', () => {
  it('returns a string containing APP_NAME', () => {
    const dir = configDir();
    expect(typeof dir).toBe('string');
    expect(dir).toContain(APP_NAME);
  });
});

describe('configPath', () => {
  it('ends with config.yaml', () => {
    const p = configPath();
    expect(p).toMatch(/config\.yaml$/);
  });

  it('contains APP_NAME in the path', () => {
    const p = configPath();
    expect(p).toContain(APP_NAME);
  });
});

describe('loadConfig / saveConfig round-trip', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pmcli-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('round-trips a full config', async () => {
    const cfg = defaultConfig();
    cfg.bridge.email = 'test@proton.me';
    cfg.defaults.limit = 50;

    const filePath = join(tmpDir, 'config.yaml');
    await saveConfig(cfg, filePath);
    const loaded = await loadConfig(filePath);

    expect(loaded).toEqual(cfg);
  });

  it('returns defaults when file does not exist', async () => {
    const filePath = join(tmpDir, 'nonexistent.yaml');
    const loaded = await loadConfig(filePath);
    expect(loaded).toEqual(defaultConfig());
  });

  it('merges partial config with defaults', async () => {
    const filePath = join(tmpDir, 'partial.yaml');
    // Write a partial YAML file (only bridge section, missing defaults)
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, 'bridge:\n  email: partial@test.com\n', 'utf-8');

    const loaded = await loadConfig(filePath);

    // Partial value should be applied
    expect(loaded.bridge.email).toBe('partial@test.com');
    // Other bridge fields should be defaults
    expect(loaded.bridge.imap_host).toBe('127.0.0.1');
    expect(loaded.bridge.imap_port).toBe(1143);
    // Defaults section should be fully defaulted
    expect(loaded.defaults).toEqual(defaultConfig().defaults);
  });

  it('saveConfig creates directories if needed', async () => {
    const nested = join(tmpDir, 'deep', 'nested', 'config.yaml');
    const cfg = defaultConfig();
    await saveConfig(cfg, nested);
    expect(existsSync(nested)).toBe(true);
  });
});

describe('configExists', () => {
  it('returns a boolean', () => {
    const result = configExists();
    expect(typeof result).toBe('boolean');
  });
});
