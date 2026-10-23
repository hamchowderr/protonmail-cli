import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  DEFAULT_IMAP_HOST,
  DEFAULT_IMAP_PORT,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  defaultConfig,
  formatSender,
} from '../../src/config/types.js';

describe('config constants', () => {
  it('APP_NAME is protonmail-cli', () => {
    expect(APP_NAME).toBe('protonmail-cli');
  });

  it('DEFAULT_IMAP_HOST is 127.0.0.1', () => {
    expect(DEFAULT_IMAP_HOST).toBe('127.0.0.1');
  });

  it('DEFAULT_IMAP_PORT is 1143', () => {
    expect(DEFAULT_IMAP_PORT).toBe(1143);
  });

  it('DEFAULT_SMTP_HOST is 127.0.0.1', () => {
    expect(DEFAULT_SMTP_HOST).toBe('127.0.0.1');
  });

  it('DEFAULT_SMTP_PORT is 1025', () => {
    expect(DEFAULT_SMTP_PORT).toBe(1025);
  });
});

describe('defaultConfig', () => {
  it('returns correct bridge defaults', () => {
    const cfg = defaultConfig();
    expect(cfg.bridge).toEqual({
      imap_host: '127.0.0.1',
      imap_port: 1143,
      smtp_host: '127.0.0.1',
      smtp_port: 1025,
      email: '',
      name: '',
    });
  });

  it('returns correct defaults section', () => {
    const cfg = defaultConfig();
    expect(cfg.defaults).toEqual({
      mailbox: 'INBOX',
      limit: 25,
      format: 'text',
    });
  });

  it('returns a fresh object each call', () => {
    const a = defaultConfig();
    const b = defaultConfig();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('formatSender', () => {
  it('returns the bare address when no name is set', () => {
    expect(formatSender('jane@example.com')).toBe('jane@example.com');
    expect(formatSender('jane@example.com', '')).toBe('jane@example.com');
    expect(formatSender('jane@example.com', '   ')).toBe('jane@example.com');
  });

  it('quotes the display name before the address', () => {
    expect(formatSender('jane@example.com', 'Jane Doe')).toBe('"Jane Doe" <jane@example.com>');
  });

  it('escapes quotes and backslashes in the name', () => {
    expect(formatSender('jane@example.com', 'Jane "JD" Doe')).toBe(
      '"Jane \\"JD\\" Doe" <jane@example.com>',
    );
    expect(formatSender('jane@example.com', 'A\\B')).toBe('"A\\\\B" <jane@example.com>');
  });
});
