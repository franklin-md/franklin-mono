import { describe, expect, it } from 'vitest';
import { defaultToolRenderOutput } from '../tool.js';

describe('defaultToolRenderOutput', () => {
	it('converts a string to RenderedToolOutput text', () => {
		expect(defaultToolRenderOutput('hello')).toEqual({
			content: [{ type: 'text', text: 'hello' }],
		});
	});

	it('projects JSON outputs to compact JSON text by default', () => {
		expect(defaultToolRenderOutput({ count: 2 })).toEqual({
			content: [{ type: 'text', text: '{"count":2}' }],
		});
	});

	it('passes through rendered tool output by default', () => {
		const rendered = {
			content: [{ type: 'text' as const, text: 'bad input' }],
			isError: true,
		};

		expect(defaultToolRenderOutput(rendered)).toBe(rendered);
	});

	it('does not treat arbitrary content-shaped raw objects like RenderedToolOutput', () => {
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

	it('does not treat content-shaped raw objects with extra fields like RenderedToolOutput', () => {
		expect(
			defaultToolRenderOutput({
				content: [{ type: 'text', text: 'raw content field' }],
				metadata: { source: 'raw output' },
			}),
		).toEqual({
			content: [
				{
					type: 'text',
					text: '{"content":[{"type":"text","text":"raw content field"}],"metadata":{"source":"raw output"}}',
				},
			],
		});
	});
});
