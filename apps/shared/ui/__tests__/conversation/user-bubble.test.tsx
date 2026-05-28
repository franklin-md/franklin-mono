// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { UserMessage } from '@franklin/mini-acp';

import { UserBubble } from '../../src/conversation/turn/user-bubble.js';

function createUserMessage(text: string): UserMessage {
	return {
		role: 'user',
		content: [{ type: 'text', text }],
	};
}

describe('UserBubble', () => {
	afterEach(cleanup);

	it('renders user text through markdown', () => {
		const { container } = render(
			<UserBubble message={createUserMessage('Read ~~this~~')} />,
		);

		expect(container.querySelector('del')?.textContent).toBe('this');
	});

	it('renders canonical file reference tokens as file badges', () => {
		const { container } = render(
			<UserBubble
				message={createUserMessage('Read @{notes/deep work.md} next')}
			/>,
		);

		expect(screen.getByText('deep work.md')).toBeTruthy();
		expect(container.textContent).toContain('Read ');
		expect(container.textContent).toContain(' next');
		expect(container.textContent).not.toContain('@{notes/deep work.md}');
	});
});
