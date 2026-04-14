import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// We need to mock configDir before importing the module under test,
// because storePath() calls configDir() internally.
vi.mock('../../src/config/config.js', () => ({
  configDir: vi.fn(),
}));

import { configDir } from '../../src/config/config.js';
import { checkIdempotencyKey, recordIdempotencyKey } from '../../src/config/idempotency.js';

const mockedConfigDir = vi.mocked(configDir);

describe('idempotency', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pmcli-idemp-'));
    mockedConfigDir.mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('checkIdempotencyKey returns false for unknown key', async () => {
    const result = await checkIdempotencyKey('unknown-key');
    expect(result).toBe(false);
  });

  it('recordIdempotencyKey then checkIdempotencyKey returns true', async () => {
    await recordIdempotencyKey('test-key');
    const result = await checkIdempotencyKey('test-key');
    expect(result).toBe(true);
  });

  it('expired keys return false', async () => {
    // Record a key, then advance time past TTL (24 hours)
    await recordIdempotencyKey('old-key');

    // Mock Date.now to return a time 25 hours in the future
    const realNow = Date.now();
    const twentyFiveHours = 25 * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(realNow + twentyFiveHours);

    const result = await checkIdempotencyKey('old-key');
    expect(result).toBe(false);
  });

  it('expired keys are pruned from store on record', async () => {
    // Record a key at current time
    await recordIdempotencyKey('old-key');

    // Advance time past TTL
    const realNow = Date.now();
    const twentyFiveHours = 25 * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(realNow + twentyFiveHours);

    // Record a new key (this triggers pruneExpired)
    await recordIdempotencyKey('new-key');

    // Restore time
    vi.restoreAllMocks();
    mockedConfigDir.mockReturnValue(tmpDir);

    // The old key should have been pruned from disk
    // But since we restored time, Date.now() is back to "now",
    // and the new-key was recorded at future time, so it will look valid.
    // Let's just verify old-key is gone by reading the file directly.
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(join(tmpDir, 'idempotency.json'), 'utf-8');
    const store = JSON.parse(raw);
    expect(store['old-key']).toBeUndefined();
    expect(store['new-key']).toBeDefined();
  });
});
