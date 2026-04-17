// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CopyRuntimeStateButton } from '../../src/components/copy-runtime-state-button.js';

const state = vi.fn<() => Promise<unknown>>();
const useAgent = vi.fn(() => ({ state }));

vi.mock('@franklin/react', () => ({
	useAgent: () => useAgent(),
}));

describe('CopyRuntimeStateButton', () => {
	let writeText: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		state.mockReset();
		useAgent.mockClear();
		vi.restoreAllMocks();
		writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText,
			},
		});
	});

	it('copies the active runtime state to the clipboard', async () => {
		state.mockResolvedValue({ agent: 'demo', nested: { count: 1 } });
		const onCopied = vi.fn();

		render(<CopyRuntimeStateButton onCopied={onCopied} />);

		fireEvent.click(screen.getByRole('button', { name: 'Copy runtime state' }));

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith(
				JSON.stringify({ agent: 'demo', nested: { count: 1 } }, null, 2),
			);
		});
		expect(onCopied).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole('button', { name: 'Runtime state copied' }),
		).toBeTruthy();
	});

	it('forwards clipboard failures to onCopyError', async () => {
		const error = new Error('clipboard unavailable');
		state.mockResolvedValue({ agent: 'demo' });
		writeText.mockRejectedValue(error);
		const onCopyError = vi.fn();

		render(<CopyRuntimeStateButton onCopyError={onCopyError} />);

		fireEvent.click(screen.getByRole('button', { name: 'Copy runtime state' }));

		await waitFor(() => {
			expect(onCopyError).toHaveBeenCalledWith(error);
		});
	});
});
