import { Entry } from '@napi-rs/keyring';
import { loadConfig } from './config.js';

export const KEYRING_SERVICE = 'protonmail-cli';

async function resolveAccount(account?: string): Promise<string> {
  if (account) return account;
  const cfg = await loadConfig();
  if (!cfg.bridge.email) throw new Error('No account specified and no email configured');
  return cfg.bridge.email;
}

export async function getPassword(
  service: string = KEYRING_SERVICE,
  account?: string,
): Promise<string | null> {
  const acct = account ?? (await loadConfig()).bridge.email;
  if (!acct) return null;

  try {
    const entry = new Entry(service, acct);
    return entry.getPassword();
  } catch {
    return null;
  }
}

export async function setPassword(
  password: string,
  service: string = KEYRING_SERVICE,
  account?: string,
): Promise<void> {
  const acct = await resolveAccount(account);
  const entry = new Entry(service, acct);
  entry.setPassword(password);
}

export async function deletePassword(
  service: string = KEYRING_SERVICE,
  account?: string,
): Promise<void> {
  const acct = await resolveAccount(account);

  try {
    const entry = new Entry(service, acct);
    entry.deletePassword();
  } catch {
    // Key may not exist — ignore
  }
}
