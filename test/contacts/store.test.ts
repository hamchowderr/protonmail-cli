import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContactStore } from '../../src/contacts/store.js';

describe('ContactStore', () => {
  let tmpDir: string;
  let store: ContactStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pmcli-contacts-'));
    store = new ContactStore(join(tmpDir, 'contacts.json'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('add and list round-trip', async () => {
    await store.add('alice@example.com', 'Alice');
    const contacts = await store.list();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].email).toBe('alice@example.com');
    expect(contacts[0].name).toBe('Alice');
  });

  it('add normalizes email to lowercase', async () => {
    const contact = await store.add('Alice@EXAMPLE.COM', 'Alice');
    expect(contact.email).toBe('alice@example.com');
  });

  it('add rejects duplicate email', async () => {
    await store.add('bob@example.com', 'Bob');
    await expect(store.add('BOB@example.com', 'Bob2')).rejects.toThrow(
      'Contact already exists',
    );
  });

  it('remove removes a contact', async () => {
    await store.add('charlie@example.com', 'Charlie');
    const removed = await store.remove('charlie@example.com');
    expect(removed).toBe(true);

    const contacts = await store.list();
    expect(contacts).toHaveLength(0);
  });

  it('remove returns false for nonexistent contact', async () => {
    const removed = await store.remove('nobody@example.com');
    expect(removed).toBe(false);
  });

  it('search finds by email substring', async () => {
    await store.add('dave@example.com', 'Dave');
    await store.add('eve@other.com', 'Eve');

    const results = await store.search('example');
    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('dave@example.com');
  });

  it('search finds by name substring (case insensitive)', async () => {
    await store.add('frank@example.com', 'Frank Miller');
    await store.add('grace@example.com', 'Grace');

    const results = await store.search('frank');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Frank Miller');
  });

  it('get returns the contact by email', async () => {
    await store.add('heidi@example.com', 'Heidi');
    const contact = await store.get('heidi@example.com');
    expect(contact).toBeDefined();
    expect(contact!.email).toBe('heidi@example.com');
  });

  it('get returns undefined for nonexistent contact', async () => {
    const contact = await store.get('nobody@example.com');
    expect(contact).toBeUndefined();
  });

  it('add sets created and updated timestamps', async () => {
    const contact = await store.add('ivan@example.com', 'Ivan');
    expect(contact.created).toBeDefined();
    expect(contact.updated).toBeDefined();
    // Should be valid ISO strings
    expect(new Date(contact.created).toISOString()).toBe(contact.created);
  });
});
