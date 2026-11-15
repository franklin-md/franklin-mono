// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import type { ConversationTurn } from '@franklin/agent';
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
					usage: {
						tokens: {
							input: 16,
							output: 4_855,
							cacheRead: 1_386_598,
							cacheWrite: 18_869,
							total: 1_410_338,
						},
						cost: {
							input: 0,
							output: 0,
							cacheRead: 0,
							cacheWrite: 0,
							total: undefined,
						},
					},
				},
			],
		},
	};
}

function finishedTurnWithoutUsage(
	id: string,
	elapsedMs: number,
): ConversationTurn {
	return {
		id,
		timestamp: 0,
		prompt: { role: 'user', content: [{ type: 'text', text: `prompt ${id}` }] },
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
					startedAt: elapsedMs,
					endedAt: elapsedMs,
					stopCode: StopCode.Finished,
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

	it('renders the elapsed duration for each completed turn', () => {
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

	it('renders a copy-message button on every completed turn that copies that turn’s assistant text', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText },
		});

		render(
			<MockAgentsDecorator activeSessionId="active-session">
				<ConversationView
					turns={[finishedTurn('first', 65_000), finishedTurn('last', 83_000)]}
				/>
			</MockAgentsDecorator>,
		);

		const copyButtons = screen.getAllByRole('button', { name: 'Copy message' });
		expect(copyButtons).toHaveLength(2);
		const [firstCopy, lastCopy] = copyButtons;
		if (!firstCopy || !lastCopy) throw new Error('copy buttons missing');

		fireEvent.click(firstCopy);
		expect(writeText).toHaveBeenLastCalledWith('reply first');

		fireEvent.click(lastCopy);
		expect(writeText).toHaveBeenLastCalledWith('reply last');
	});

	it.each([
		[0.0142, '1.4¢'],
		[0.0149, '1.5¢'],
		[0.01, '1¢'],
		[0.01999, '2¢'],
		[0.001, '0.1¢'],
		[0.0009999, '< 0.1¢'],
		[0, '0¢'],
		[0.000001, '< 0.1¢'],
	] as const)(
		'shows available cost %s as %s beside turn details',
		(total, label) => {
			const turn = finishedTurn('last', 12_000);
			const end = turn.response.blocks.find(
				(block) => block.kind === 'turnEnd',
			);
			if (!end?.usage) throw new Error('Expected usage');
			end.usage.cost.total = total;
			render(
				<MockAgentsDecorator activeSessionId="active-session">
					<ConversationView turns={[turn]} />
				</MockAgentsDecorator>,
			);
			const cost = screen.getByText(label);
			const trigger = screen.getByRole('button', { name: 'Turn details' });
			expect(trigger.textContent).toBe('Ran for 12s');
			expect(cost.previousElementSibling?.textContent).toBe('·');
			expect(cost.parentElement).toBe(trigger.parentElement);
			fireEvent.focus(trigger);
			expect(within(screen.getByRole('tooltip')).queryByText(label)).toBeNull();
		},
	);

	it.each([undefined, -1, NaN, Infinity])(
		'hides unavailable cost %s and its separator',
		(total) => {
			const turn = finishedTurn('last', 12_000);
			const end = turn.response.blocks.find(
				(block) => block.kind === 'turnEnd',
			);
			if (!end?.usage) throw new Error('Expected usage');
			end.usage.cost.total = total;
			render(
				<MockAgentsDecorator activeSessionId="active-session">
					<ConversationView turns={[turn]} />
				</MockAgentsDecorator>,
			);
			const trigger = screen.getByRole('button', { name: 'Turn details' });
			expect(screen.queryByTitle('Turn cost (US cents)')).toBeNull();
			// Only the separator before the action buttons remains.
			expect(
				trigger.parentElement?.querySelectorAll('span[aria-hidden]'),
			).toHaveLength(1);
		},
	);

	it('opens a details tooltip on focus and shows token usage', () => {
		render(
			<MockAgentsDecorator activeSessionId="active-session">
				<ConversationView turns={[finishedTurn('last', 127_000)]} />
			</MockAgentsDecorator>,
		);

		const trigger = screen.getByRole('button', { name: 'Turn details' });
		expect(trigger.textContent).toBe('Ran for 2m 7s');
		fireEvent.focus(trigger);

		expect(screen.getAllByText('Input').length).toBeGreaterThan(0);
		expect(screen.getAllByText('16').length).toBeGreaterThan(0);
		expect(screen.getAllByText('4,855').length).toBeGreaterThan(0);
		expect(screen.getAllByText('1,386,598').length).toBeGreaterThan(0);
		expect(screen.getAllByText('18,869').length).toBeGreaterThan(0);
	});

	it('hides cost and shows unavailable token details when turn usage is missing', () => {
		render(
			<MockAgentsDecorator activeSessionId="active-session">
				<ConversationView turns={[finishedTurnWithoutUsage('last', 127_000)]} />
			</MockAgentsDecorator>,
		);

		const trigger = screen.getByRole('button', { name: 'Turn details' });
		expect(trigger.textContent).toBe('Ran for 2m 7s');
		fireEvent.focus(trigger);

		const tooltip = screen.getByRole('tooltip');
		expect(within(tooltip).getByText('Usage details unavailable')).toBeTruthy();
		expect(within(tooltip).queryByText('Input')).toBeNull();
	});
});
