import { describe, expect, it } from 'vitest';
import { resolveToolOutput } from '../tool.js';

describe('resolveToolOutput', () => {
	it('converts a string to ToolOutput', () => {
		expect(resolveToolOutput('hello')).toEqual({
			content: [{ type: 'text', text: 'hello' }],
		});
	});

	it('passes through a ToolOutput unchanged', () => {
		const output = {
			content: [{ type: 'text' as const, text: 'already structured' }],
			isError: true,
		};

		expect(resolveToolOutput(output)).toBe(output);
	});
});
