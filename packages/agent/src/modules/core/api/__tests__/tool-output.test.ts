import { describe, expect, it } from 'vitest';
import { defaultToolRenderOutput } from '../tool.js';

describe('defaultToolRenderOutput', () => {
	it('converts a string to ToolOutput text', () => {
		expect(defaultToolRenderOutput('hello')).toEqual({
			content: [{ type: 'text', text: 'hello' }],
		});
	});

	it('projects JSON outputs to compact JSON text by default', () => {
		expect(defaultToolRenderOutput({ count: 2 })).toEqual({
			content: [{ type: 'text', text: '{"count":2}' }],
		});
	});

	it('does not treat arbitrary content-shaped raw objects like ToolOutput', () => {
		expect(
			defaultToolRenderOutput({
				content: ['not MiniACP content'],
				metadata: { source: 'raw output' },
			}),
		).toEqual({
			content: [
				{
					type: 'text',
					text: '{"content":["not MiniACP content"],"metadata":{"source":"raw output"}}',
				},
			],
		});
	});
});
