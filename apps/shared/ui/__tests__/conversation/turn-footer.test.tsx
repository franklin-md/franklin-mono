// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import type { ConversationTurn } from '@franklin/extensions';
import { StopCode } from '@franklin/mini-acp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConversationView } from '../../src/conversation/view.js';
import { MockAgentsDecorator } from '../../stories/mock-agent.js';

function finishedTurn(id: string, elapsedMs: number): ConversationTurn {
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
					endedAt: elapsedMs,
				},
				{
					kind: 'turnEnd',
					stopCode: StopCode.Finished,
					startedAt: elapsedMs,
					endedAt: elapsedMs,
				},
			],
		},
	};
}

describe('TurnFooter', () => {
	afterEach(() => {
		cleanup();
	});

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
					turns={[finishedTurn('first', 65_000), finishedTurn('last', 83_000)]}
				/>
			</MockAgentsDecorator>,
		);

		expect(
			screen.getAllByRole('button', { name: 'Continue in new chat' }),
		).toHaveLength(1);
	});

	it('renders the runtime for each completed turn footer', () => {
		render(
			<MockAgentsDecorator activeSessionId="active-session">
				<ConversationView
					turns={[finishedTurn('first', 65_000), finishedTurn('last', 83_000)]}
				/>
			</MockAgentsDecorator>,
		);

		expect(screen.getByText('Ran for 1m 5s')).toBeTruthy();
		expect(screen.getByText('Ran for 1m 23s')).toBeTruthy();
	});
});
