import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { configDir } from './config.js';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface IdempotencyRecord {
  [key: string]: number; // key -> timestamp ms
}

function storePath(): string {
  return join(configDir(), 'idempotency.json');
}

async function loadStore(): Promise<IdempotencyRecord> {
  try {
    const raw = await readFile(storePath(), 'utf-8');
    return JSON.parse(raw) as IdempotencyRecord;
  } catch {
    return {};
  }
}

function pruneExpired(store: IdempotencyRecord): IdempotencyRecord {
  const now = Date.now();
  const pruned: IdempotencyRecord = {};

  for (const [key, timestamp] of Object.entries(store)) {
    if (now - timestamp < TTL_MS) {
      pruned[key] = timestamp;
    }
  }

  return pruned;
}

async function saveStore(store: IdempotencyRecord): Promise<void> {
  const filePath = storePath();
  const dir = dirname(filePath);

  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(filePath, JSON.stringify(store, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

export async function checkIdempotencyKey(key: string): Promise<boolean> {
  const store = await loadStore();
  const timestamp = store[key];

  if (timestamp === undefined) return false;

  return Date.now() - timestamp < TTL_MS;
}

export async function recordIdempotencyKey(key: string): Promise<void> {
  const store = await loadStore();
  store[key] = Date.now();

  const pruned = pruneExpired(store);
  await saveStore(pruned);
}
