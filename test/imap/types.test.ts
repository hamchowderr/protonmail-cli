import { describe, it, expect } from 'vitest';
import { parseMessageSelector } from '../../src/imap/types.js';

describe('parseMessageSelector', () => {
  it('parses "uid:123" as uid selector', () => {
    const result = parseMessageSelector('uid:123');
    expect(result).toEqual({ kind: 'uid', uid: 123 });
  });

  it('parses "42" as seq selector', () => {
    const result = parseMessageSelector('42');
    expect(result).toEqual({ kind: 'seq', seq: 42 });
  });

  it('throws for "uid:0"', () => {
    expect(() => parseMessageSelector('uid:0')).toThrow();
  });

  it('throws for "abc"', () => {
    expect(() => parseMessageSelector('abc')).toThrow();
  });

  it('handles whitespace: " uid:456 "', () => {
    const result = parseMessageSelector(' uid:456 ');
    expect(result).toEqual({ kind: 'uid', uid: 456 });
  });

  it('handles case insensitive: "UID:789"', () => {
    const result = parseMessageSelector('UID:789');
    expect(result).toEqual({ kind: 'uid', uid: 789 });
  });

  it('throws for negative uid', () => {
    expect(() => parseMessageSelector('uid:-1')).toThrow();
  });

  it('throws for "0" (seq must be positive)', () => {
    expect(() => parseMessageSelector('0')).toThrow();
  });

  it('throws for negative seq', () => {
    expect(() => parseMessageSelector('-5')).toThrow();
  });
});
