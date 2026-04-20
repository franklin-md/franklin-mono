// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InspectDumpButton } from '../../src/components/inspect-dump-button.js';

const runtime = { __marker: 'runtime' as const };
const useAgent = vi.fn(() => runtime);
const inspectRuntime = vi.fn<(arg: unknown) => Promise<unknown>>();

vi.mock('@franklin/react', () => ({
	useAgent: () => useAgent(),
}));

vi.mock('@franklin/extensions', () => ({
	inspectRuntime: (arg: unknown) => inspectRuntime(arg),
}));

describe('InspectDumpButton', () => {
	let writeText: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		inspectRuntime.mockReset();
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

	it('copies the inspect dump of the active runtime to the clipboard', async () => {
		const dump = {
			core: { history: { systemPrompt: 'sys' } },
			todos: { items: [] },
		};
		inspectRuntime.mockResolvedValue(dump);
		const onCopied = vi.fn();

		render(<InspectDumpButton onCopied={onCopied} />);

		fireEvent.click(screen.getByRole('button', { name: 'Copy inspect dump' }));

		await waitFor(() => {
			expect(inspectRuntime).toHaveBeenCalledWith(runtime);
			expect(writeText).toHaveBeenCalledWith(JSON.stringify(dump, null, 2));
		});
		expect(onCopied).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole('button', { name: 'Inspect dump copied' }),
		).toBeTruthy();
	});

	it('forwards clipboard failures to onCopyError', async () => {
		const error = new Error('clipboard unavailable');
		inspectRuntime.mockResolvedValue({});
		writeText.mockRejectedValue(error);
		const onCopyError = vi.fn();

		render(<InspectDumpButton onCopyError={onCopyError} />);

		fireEvent.click(screen.getByRole('button', { name: 'Copy inspect dump' }));

		await waitFor(() => {
			expect(onCopyError).toHaveBeenCalledWith(error);
		});
	});
});
