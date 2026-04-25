// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationTurn } from '@franklin/extensions';
import type * as FranklinReact from '@franklin/react';

const mocks = vi.hoisted(() => ({
	useAutoFollow: vi.fn(),
	useFirstMountEffect: vi.fn((effect: () => void) => effect()),
}));

vi.mock('@franklin/react', async () => {
	const actual = await vi.importActual<typeof FranklinReact>('@franklin/react');

	return {
		...actual,
		useAutoFollow: mocks.useAutoFollow,
		useFirstMountEffect: mocks.useFirstMountEffect,
	};
});

import { ConversationView } from '../../src/conversation/view.js';

function createTurn(id: string): ConversationTurn {
	return {
		id,
		timestamp: Date.now(),
		prompt: {
			role: 'user',
			content: [{ type: 'text', text: `Prompt ${id}` }],
		},
		response: {
			blocks: [{ kind: 'text', text: `Response ${id}`, startedAt: 0 }],
		},
	};
}

describe('ConversationView', () => {
	beforeEach(() => {
		mocks.useAutoFollow.mockReset();
		mocks.useFirstMountEffect.mockClear();
	});

	it('follows to the bottom when mounted with an existing chat history', () => {
		const follow = vi.fn();
		mocks.useAutoFollow.mockReturnValue({
			contentRef: vi.fn(),
			follow,
			handleScroll: vi.fn(),
			viewportRef: vi.fn(),
		});

		render(<ConversationView turns={[createTurn('turn-1')]} />);

		expect(follow).toHaveBeenCalledTimes(1);
	});
});
