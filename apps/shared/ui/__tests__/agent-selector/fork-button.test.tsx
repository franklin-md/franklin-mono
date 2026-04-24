// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import type { AgentsControl } from '@franklin/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ForkButton } from '../../src/agent-selector/fork-button.js';

const useAgentsFn = vi.fn<() => AgentsControl>();

vi.mock('@franklin/react', () => ({
	useAgents: () => useAgentsFn(),
}));

function CustomIcon({ className }: { className?: string }) {
	return <svg className={className} data-testid="custom-icon" />;
}

function setAgentsMock({
	activeSessionId,
	create = vi.fn<AgentsControl['create']>(),
}: {
	activeSessionId: string | null;
	create?: AgentsControl['create'];
}) {
	useAgentsFn.mockReturnValue({
		sessions: [],
		activeSessionId,
		activeSession: undefined,
		select: vi.fn(),
		create,
		remove: vi.fn(),
	});
	return create;
}

describe('ForkButton', () => {
	afterEach(() => {
		cleanup();
		useAgentsFn.mockReset();
	});

	it('is disabled when activeSessionId is null', () => {
		setAgentsMock({ activeSessionId: null });

		render(<ForkButton />);

		const button = screen.getByRole('button', {
			name: 'Continue in new chat',
		});
		expect(button.hasAttribute('disabled')).toBe(true);
	});

	it('forks the active session on click and calls onCreated', async () => {
		const session = {
			id: 'forked-session',
			runtime: {},
		} as Awaited<ReturnType<AgentsControl['create']>>;
		const create = vi.fn<AgentsControl['create']>().mockResolvedValue(session);
		const onCreated = vi.fn();
		setAgentsMock({ activeSessionId: 'active-session', create });

		render(<ForkButton onCreated={onCreated} />);

		fireEvent.click(
			screen.getByRole('button', { name: 'Continue in new chat' }),
		);

		await waitFor(() => {
			expect(create).toHaveBeenCalledWith({
				from: 'active-session',
				mode: 'fork',
			});
			expect(onCreated).toHaveBeenCalledWith(session);
		});
	});

	it('does not call create when clicked in a disabled state', () => {
		const create = vi.fn<AgentsControl['create']>();
		setAgentsMock({ activeSessionId: null, create });

		render(<ForkButton />);

		fireEvent.click(
			screen.getByRole('button', { name: 'Continue in new chat' }),
		);

		expect(create).not.toHaveBeenCalled();
	});

	it('renders MdForkRight by default', () => {
		setAgentsMock({ activeSessionId: 'active-session' });

		const { container } = render(<ForkButton />);

		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('renders the provided icon in place of MdForkRight', () => {
		setAgentsMock({ activeSessionId: 'active-session' });

		render(<ForkButton icon={CustomIcon} />);

		expect(screen.getByTestId('custom-icon')).toBeTruthy();
	});
});
