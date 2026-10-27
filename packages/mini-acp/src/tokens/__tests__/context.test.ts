import { describe, expect, it } from 'vitest';
import { estimateContextTokens } from '../context.js';
import { estimateMessageTokens } from '../message.js';

describe('context budgeting', () => {
	it('accounts for system instructions and tool schemas as well as messages', () => {
		const base = { systemPrompt: '', messages: [], tools: [] };
		const empty = estimateContextTokens(base);
		expect(
			estimateContextTokens({
				...base,
				systemPrompt: 'instructions '.repeat(1000),
			}),
		).toBeGreaterThan(empty + 1000);
		expect(
			estimateContextTokens({
				...base,
				tools: [
					{
						name: 'lookup',
						description: 'description '.repeat(1000),
						inputSchema: {},
					},
				],
			}),
		).toBeGreaterThan(empty + 1000);
		expect(
			estimateContextTokens({
				...base,
				messages: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'new prompt '.repeat(1000) }],
					},
				],
			}),
		).toBeGreaterThan(empty + 1000);
	});

	it('budgets images without counting base64 payloads as text', () => {
		const image = (data: string) =>
			estimateMessageTokens({
				role: 'user',
				content: [{ type: 'image', mimeType: 'image/png', data }],
			});
		expect(image('tiny')).toBe(image('x'.repeat(1_000_000)));
		expect(image('tiny')).toBeGreaterThan(0);
	});
});
