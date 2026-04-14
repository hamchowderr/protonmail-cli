import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Formatter } from '../../src/output/formatter.js';

describe('Formatter', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('printJSON', () => {
    it('outputs valid JSON to stdout', () => {
      const fmt = new Formatter({ json: true, verbose: false, quiet: false, noColor: false });
      const data = { hello: 'world', count: 42 };
      fmt.printJSON(data);

      expect(stdoutSpy).toHaveBeenCalledOnce();
      const output = stdoutSpy.mock.calls[0][0] as string;
      expect(JSON.parse(output)).toEqual(data);
    });
  });

  describe('printError', () => {
    it('in JSON mode outputs { success: false, error: ... }', () => {
      const fmt = new Formatter({ json: true, verbose: false, quiet: false, noColor: false });
      fmt.printError('something broke');

      expect(stdoutSpy).toHaveBeenCalledOnce();
      const output = stdoutSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).toEqual({ success: false, error: 'something broke' });
    });

    it('in text mode writes to stderr', () => {
      const fmt = new Formatter({ json: false, verbose: false, quiet: false, noColor: true });
      fmt.printError('something broke');

      expect(stderrSpy).toHaveBeenCalledOnce();
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain('something broke');
      expect(output).toContain('Error');
    });

    it('accepts an Error object', () => {
      const fmt = new Formatter({ json: true, verbose: false, quiet: false, noColor: false });
      fmt.printError(new Error('err msg'));

      const output = stdoutSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.error).toBe('err msg');
    });
  });

  describe('printSuccess', () => {
    it('in quiet mode produces no output', () => {
      const fmt = new Formatter({ json: false, verbose: false, quiet: true, noColor: false });
      fmt.printSuccess('done');

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('in JSON mode outputs { success: true, message: ... }', () => {
      const fmt = new Formatter({ json: true, verbose: false, quiet: false, noColor: false });
      fmt.printSuccess('all good');

      expect(stdoutSpy).toHaveBeenCalledOnce();
      const output = stdoutSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).toEqual({ success: true, message: 'all good' });
    });

    it('in text mode writes to stdout', () => {
      const fmt = new Formatter({ json: false, verbose: false, quiet: false, noColor: true });
      fmt.printSuccess('done');

      expect(stdoutSpy).toHaveBeenCalledOnce();
      const output = stdoutSpy.mock.calls[0][0] as string;
      expect(output).toContain('done');
    });
  });

  describe('isJSON', () => {
    it('returns true when json option is true', () => {
      const fmt = new Formatter({ json: true, verbose: false, quiet: false, noColor: false });
      expect(fmt.isJSON).toBe(true);
    });

    it('returns false when json option is false', () => {
      const fmt = new Formatter({ json: false, verbose: false, quiet: false, noColor: false });
      expect(fmt.isJSON).toBe(false);
    });
  });
});
