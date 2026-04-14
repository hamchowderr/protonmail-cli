import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  DEFAULT_IMAP_HOST,
  DEFAULT_IMAP_PORT,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  defaultConfig,
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
