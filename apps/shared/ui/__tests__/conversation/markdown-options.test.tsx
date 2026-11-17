// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { MarkdownProps } from '../../src/conversation/turn/markdown.js';
import { TextBlock } from '../../src/conversation/turn/text/text.js';
import { ThinkingBlock } from '../../src/conversation/turn/thinking.js';
import { UserBubble } from '../../src/conversation/turn/user-bubble/index.js';

const text = 'hello **content**';
const renderers = [
	{
		name: 'TextBlock',
		render: (markdown: Omit<MarkdownProps, 'text'>) => (
			<TextBlock
				block={{ kind: 'text', text, startedAt: 0 }}
				markdown={markdown}
			/>
		),
	},
	{
		name: 'ThinkingBlock',
		render: (markdown: Omit<MarkdownProps, 'text'>) => (
			<ThinkingBlock
				block={{ kind: 'thinking', text, startedAt: 0 }}
				markdown={markdown}
			/>
		),
	},
	{
		name: 'UserBubble',
		render: (markdown: Omit<MarkdownProps, 'text'>) => (
			<UserBubble
				message={{ role: 'user', content: [{ type: 'text', text }] }}
				markdown={markdown}
			/>
		),
	},
];

afterEach(cleanup);

describe.each(renderers)('$name Markdown options', ({ render: renderer }) => {
	it('forwards styling, component overrides and parsing options', () => {
		const { container } = render(
			renderer({
				className: 'host-markdown',
				components: { strong: 'mark' },
				remend: {
					handlers: [
						{
							name: 'replace-hello',
							priority: 0,
							handle: (value) => value.replace('hello', 'forwarded'),
						},
					],
				},
			}),
		);

		expect(container.querySelector('.host-markdown')?.textContent).toBe(
			'forwarded content',
		);
		expect(container.querySelector('mark')?.textContent).toBe('content');
	});
});
