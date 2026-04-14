import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { configDir } from '../config/config.js';
import type { Contact } from './types.js';

export class ContactStore {
  private filePath: string;

  constructor(path?: string) {
    this.filePath = path ?? join(configDir(), 'contacts.json');
  }

  async load(): Promise<Contact[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as Contact[];
    } catch {
      return [];
    }
  }

  async save(contacts: Contact[]): Promise<void> {
    const dir = dirname(this.filePath);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(this.filePath, JSON.stringify(contacts, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  }

  async list(): Promise<Contact[]> {
    return this.load();
  }

  async search(query: string): Promise<Contact[]> {
    const contacts = await this.load();
    const q = query.toLowerCase();

    return contacts.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)),
    );
  }

  async add(email: string, name?: string): Promise<Contact> {
    const contacts = await this.load();
    const normalized = email.toLowerCase();

    const existing = contacts.find((c) => c.email === normalized);
    if (existing) {
      throw new Error(`Contact already exists: ${normalized}`);
    }

    const now = new Date().toISOString();
    const contact: Contact = {
      email: normalized,
      name,
      created: now,
      updated: now,
    };

    contacts.push(contact);
    await this.save(contacts);
    return contact;
  }

  async remove(email: string): Promise<boolean> {
    const contacts = await this.load();
    const normalized = email.toLowerCase();
    const filtered = contacts.filter((c) => c.email !== normalized);

    if (filtered.length === contacts.length) return false;

    await this.save(filtered);
    return true;
  }

  async get(email: string): Promise<Contact | undefined> {
    const contacts = await this.load();
    return contacts.find((c) => c.email === email.toLowerCase());
  }
}
