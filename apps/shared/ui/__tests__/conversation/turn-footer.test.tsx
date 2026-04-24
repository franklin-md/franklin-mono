// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import type { ConversationTurn } from '@franklin/extensions';
import { StopCode } from '@franklin/mini-acp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConversationView } from '../../src/conversation/view.js';
import { MockAgentsDecorator } from '../../stories/mock-agent.js';

function finishedTurn(id: string): ConversationTurn {
	return {
		id,
		timestamp: 0,
		prompt: {
			role: 'user',
			content: [{ type: 'text', text: id }],
		},
		response: {
			blocks: [
				{
					kind: 'text',
					text: `reply ${id}`,
					startedAt: 0,
					endedAt: 1,
				},
				{
					kind: 'turnEnd',
					stopCode: StopCode.Finished,
					startedAt: 1,
					endedAt: 1,
				},
			],
		},
	};
}

describe('TurnFooter', () => {
	beforeEach(() => {
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
			configurable: true,
			value: vi.fn(),
		});
	});

	it('renders the fork button only in the last completed turn footer', () => {
		render(
			<MockAgentsDecorator activeSessionId="active-session">
				<ConversationView
					turns={[finishedTurn('first'), finishedTurn('last')]}
				/>
			</MockAgentsDecorator>,
		);

		expect(
			screen.getAllByRole('button', { name: 'Continue in new chat' }),
		).toHaveLength(1);
	});
});
