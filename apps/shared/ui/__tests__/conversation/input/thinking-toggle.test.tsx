// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';

import type { ThinkingLevel } from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import type { FranklinRuntime } from '@franklin/agent';
import type { CoreEvent } from '@franklin/agent';
import { AgentProvider } from '@franklin/react';

import { ThinkingToggle } from '../../../src/conversation/input/thinking-toggle.js';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRuntime(reasoning: ThinkingLevel): FranklinRuntime {
	let level = reasoning;
	const listeners = new Set<(event: CoreEvent) => void>();

	return {
		getSession: vi.fn(() => ({
			messages: [],
			llmConfig: { reasoning: level },
			usage: ZERO_USAGE,
		})),
		setLLMConfig: vi.fn(async (config: { reasoning?: ThinkingLevel }) => {
			if (config.reasoning !== undefined) {
				level = config.reasoning;
			}
			for (const listener of listeners) {
				listener({ type: 'llm-config-changed' });
			}
		}),
		coreEvents: {
			subscribe: vi.fn((listener: (event: CoreEvent) => void) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			}),
		},
	} as unknown as FranklinRuntime;
}

function Wrapper({
	children,
	reasoning,
}: {
	children: ReactNode;
	reasoning: ThinkingLevel;
}) {
	return (
		<AgentProvider agent={makeMockRuntime(reasoning)}>{children}</AgentProvider>
	);
}

// ---------------------------------------------------------------------------
// Consistent dimensions
// ---------------------------------------------------------------------------

describe('ThinkingToggle – consistent dimensions', () => {
	const REASONING_LEVELS: ThinkingLevel[] = [
		'off',
		'minimal',
		'low',
		'medium',
		'high',
		'xhigh',
	];

	it('renders the same width and height classes for every level', () => {
		for (const level of REASONING_LEVELS) {
			const { container } = render(
				<Wrapper reasoning={level}>
					<ThinkingToggle />
				</Wrapper>,
			);

			const button = container.querySelector('[data-testid="thinking-toggle"]');
			expect(button, `button not found for level "${level}"`).toBeTruthy();

			const classes = (button as HTMLElement).className;
			expect(classes, `level "${level}" missing fixed height`).toContain('h-6');
			expect(classes, `level "${level}" missing fixed width`).toContain(
				'w-[72px]',
			);
		}
	});

	it('renders exactly four level bars for every level', () => {
		for (const level of REASONING_LEVELS) {
			const { container } = render(
				<Wrapper reasoning={level}>
					<ThinkingToggle />
				</Wrapper>,
			);

			const bars = container.querySelectorAll(
				'[data-testid="thinking-toggle-bar"]',
			);
			expect(bars.length, `level "${level}" bar count`).toBe(4);
		}
	});

	it('renders full labels without changing the fixed width', async () => {
		const expectedLabels: Record<ThinkingLevel, string> = {
			off: 'Off',
			minimal: 'Min',
			low: 'Low',
			medium: 'Med',
			high: 'High',
			xhigh: 'XHigh',
		};

		for (const level of REASONING_LEVELS) {
			const { container, findByText, unmount } = render(
				<Wrapper reasoning={level}>
					<ThinkingToggle />
				</Wrapper>,
			);

			expect(await findByText(expectedLabels[level])).toBeTruthy();
			expect(
				(
					container.querySelector(
						'[data-testid="thinking-toggle"]',
					) as HTMLElement
				).className,
				`level "${level}" should keep fixed width with full label`,
			).toContain('w-[72px]');
			unmount();
		}
	});

	it('keeps labels untruncated and the bar slot fixed at the left edge', () => {
		for (const level of REASONING_LEVELS) {
			const { container } = render(
				<Wrapper reasoning={level}>
					<ThinkingToggle />
				</Wrapper>,
			);

			const button = container.querySelector(
				'[data-testid="thinking-toggle"]',
			) as HTMLElement;
			const barSlot = button.querySelector(
				'[aria-hidden="true"]',
			) as HTMLElement;
			const label = Array.from(button.querySelectorAll('span')).find(
				(span) => span.textContent.trim() !== '',
			) as HTMLElement;
			const bars = button.querySelectorAll(
				'[data-testid="thinking-toggle-bar"]',
			);

			expect(
				button.className,
				`level "${level}" should left-align bars`,
			).toContain('justify-start');
			expect(
				barSlot.className,
				`level "${level}" should reserve a fixed bar slot`,
			).toContain('w-[18px]');
			expect(
				bars[0]?.className,
				`level "${level}" should use medium-width bars`,
			).toContain('w-[3px]');
			expect(
				label.className,
				`level "${level}" should not truncate`,
			).not.toContain('truncate');
			expect(
				label.className,
				`level "${level}" should fill the remaining button space`,
			).toContain('flex-1');
			expect(
				label.className,
				`level "${level}" should center within the remaining space`,
			).toContain('text-center');
			expect(label.className, `level "${level}" should not wrap`).toContain(
				'whitespace-nowrap',
			);
		}
	});

	it('uses a steady rising bar trajectory', () => {
		const { container } = render(
			<Wrapper reasoning="xhigh">
				<ThinkingToggle />
			</Wrapper>,
		);

		const heights = Array.from(
			container.querySelectorAll('[data-testid="thinking-toggle-bar"]'),
			(bar) =>
				Array.from((bar as HTMLElement).classList).find((className) =>
					className.startsWith('h-'),
				),
		);
		expect(heights).toEqual(['h-1', 'h-2', 'h-3', 'h-4']);
	});
});
