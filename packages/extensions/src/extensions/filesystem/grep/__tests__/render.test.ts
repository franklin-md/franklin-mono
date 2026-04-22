import { describe, expect, it } from 'vitest';
import { renderGrepInfo } from '../guidance.js';

describe('renderGrepInfo', () => {
	it('describes the ripgrep backend and its regex dialect', () => {
		const text = renderGrepInfo({ kind: 'ripgrep', command: 'rg' });
		expect(text).toContain('ripgrep');
		expect(text).toContain('Rust regex');
		expect(text).toContain('.gitignore');
		expect(text).toContain('\\d');
	});

	it('describes the POSIX grep backend with its dialect caveats', () => {
		const text = renderGrepInfo({ kind: 'grep', command: 'grep' });
		expect(text).toContain('POSIX grep');
		expect(text).toContain('Extended Regular Expressions');
		expect(text).toContain('[0-9]');
		expect(text).toContain('\\d is NOT supported');
	});

	it('describes the none backend with fallback guidance', () => {
		const text = renderGrepInfo({ kind: 'none' });
		expect(text).toContain('unavailable');
		expect(text).toContain('glob');
		expect(text).toContain('read_file');
	});
});
