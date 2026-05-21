// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';

import type { ThinkingLevel } from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import type { FranklinRuntime } from '@franklin/agent';
import type { CoreEvent } from '@franklin/agent';
import { AgentProvider } from '@franklin/react';

import { ThinkingToggle } from '../../../src/conversation/input/thinking-toggle.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRuntime(reasoning: ThinkingLevel): FranklinRuntime {
	let level = reasoning;
	const listeners = new Set<(event: CoreEvent) => void>();

	return {
		session: {
			context: vi.fn(() => ({
				systemPrompt: '',
				messages: [],
				tools: [],
				config: { reasoning: level },
			})),
			getSnapshot: vi.fn(() => ({
				messages: [],
				llmConfig: { reasoning: level },
				usage: ZERO_USAGE,
			})),
		},
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
