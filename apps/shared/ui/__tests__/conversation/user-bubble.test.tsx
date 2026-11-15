// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { formatReferenceMention } from '@franklin/agent';
import type { UserMessage } from '@franklin/mini-acp';

import { UserBubble } from '../../src/conversation/turn/user-bubble/index.js';

function createUserMessage(text: string): UserMessage {
	return {
		role: 'user',
		content: [{ type: 'text', text }],
	};
}

interface LabelProps {
	label: string;
}

function Label({ label }: LabelProps) {
	return <span>{label}</span>;
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
		const mention = formatReferenceMention({
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		});
		const { container } = render(
			<UserBubble message={createUserMessage(`Read ${mention} next`)} />,
		);

		expect(screen.getByText('deep work.md')).toBeTruthy();
		expect(container.textContent).toContain('Read ');
		expect(container.textContent).toContain(' next');
		expect(container.textContent).not.toContain(mention);
	});

	it('keeps file references when the host supplies Markdown extensions', () => {
		const mention = formatReferenceMention({ locator: 'notes/deep work.md' });
		const { container } = render(
			<UserBubble
				message={createUserMessage(
					`${mention} <host-label label="Host content"></host-label>`,
				)}
				markdown={{
					remarkPlugins: [],
					customElements: {
						'host-label': { allowedAttributes: ['label'], component: Label },
					},
				}}
			/>,
		);

		expect(screen.getByText('deep work.md')).toBeTruthy();
		expect(screen.getByText('Host content')).toBeTruthy();
		expect(container.textContent).not.toContain(mention);
	});
});
