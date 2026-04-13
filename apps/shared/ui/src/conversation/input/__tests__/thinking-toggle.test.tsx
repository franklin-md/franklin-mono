// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';

import type { ThinkingLevel } from '@franklin/mini-acp';
import type { FranklinRuntime } from '@franklin/agent/browser';
import { AgentProvider } from '@franklin/react';

import { ThinkingToggle } from '../thinking-toggle.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRuntime(reasoning: ThinkingLevel): FranklinRuntime {
	return {
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { reasoning },
			},
		})),
		setContext: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
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
	const TOGGLE_LEVELS: ThinkingLevel[] = [
		'off',
		'low',
		'medium',
		'high',
		'xhigh',
	];

	it('renders the same width and height classes for every level', () => {
		for (const level of TOGGLE_LEVELS) {
			const { container } = render(
				<Wrapper reasoning={level}>
					<ThinkingToggle />
				</Wrapper>,
			);

			const button = container.querySelector('[data-testid="thinking-toggle"]');
			expect(button, `button not found for level "${level}"`).toBeTruthy();

			const classes = (button as HTMLElement).className;
			expect(classes, `level "${level}" missing h-8`).toContain('h-8');
			expect(classes, `level "${level}" missing w-14`).toContain('w-14');
		}
	});

	it('renders exactly DOT_COUNT dots for every level', () => {
		for (const level of TOGGLE_LEVELS) {
			const { container } = render(
				<Wrapper reasoning={level}>
					<ThinkingToggle />
				</Wrapper>,
			);

			const dots = container.querySelectorAll(
				'[data-testid="thinking-toggle"] .rounded-full',
			);
			expect(dots.length, `level "${level}" dot count`).toBe(4);
		}
	});
});
