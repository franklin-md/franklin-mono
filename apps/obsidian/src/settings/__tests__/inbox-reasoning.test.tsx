// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InboxController } from '../../inbox/controller/controller.js';
import type { AnswerRequest } from '../../inbox/controller/types.js';
import type { ActionRequest } from '../../inbox/actions/types.js';
import { inboxCodec } from '../../inbox/controller/schema.js';
import { SettingsPage } from '../page.js';

vi.mock('../credentials/index.js', () => ({ CredentialsSettings: () => null }));
vi.mock('../viewing-context.js', () => ({
	ViewingContextSettings: () => null,
}));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

async function setup() {
	const persistence = createSingleFilePersister(
		new MemoryFilesystem(),
		toAbsolutePath('/inbox.json'),
		inboxCodec,
	);
	const run = vi.fn(async ({ submit }: AnswerRequest) => {
		await submit('An answer');
	});
	const runAction = vi.fn(async (_request: ActionRequest): Promise<string> => {
		throw new Error('Retry action');
	});
	const options = {
		defaults: { provider: 'test', model: 'test', reasoning: 'medium' as const },
		persistence,
		run,
		runAction,
	};
	const inbox = await InboxController.create(options);
	return { inbox, persistence, options, run, runAction };
}

async function select(value: string) {
	await act(async () => {
		fireEvent.change(
			screen.getByRole('combobox', { name: 'Reasoning level' }),
			{ target: { value } },
		);
	});
}

describe('study inbox reasoning setting', () => {
	it('shows the saved level, persists a selection across restarts and reflects external preference changes', async () => {
		const { inbox, persistence, options } = await setup();
		const { unmount } = render(<SettingsPage inbox={inbox} />);
		const input = screen.getByRole<HTMLSelectElement>('combobox', {
			name: 'Reasoning level',
		});
		expect(input.value).toBe('medium');
		expect(Array.from(input.options, (option) => option.value)).toEqual([
			'off',
			'minimal',
			'low',
			'medium',
			'high',
			'xhigh',
		]);
		await select('high');
		expect((await persistence.load()).value?.preferences.reasoning).toBe(
			'high',
		);
		unmount();
		await inbox.dispose();
		const restored = await InboxController.create(options);
		render(<SettingsPage inbox={restored} />);
		expect(
			screen.getByRole<HTMLSelectElement>('combobox', {
				name: 'Reasoning level',
			}).value,
		).toBe('high');
		await act(async () => {
			await restored.configure({ reasoning: 'low' });
		});
		expect(
			screen.getByRole<HTMLSelectElement>('combobox', {
				name: 'Reasoning level',
			}).value,
		).toBe('low');
		await restored.dispose();
	});
	it('applies the selection to new questions, follow-ups and actions while retries retain the original level', async () => {
		const { inbox, run, runAction } = await setup();
		render(<SettingsPage inbox={inbox} />);
		run.mockRejectedValueOnce(new Error('Retry question'));
		const original = await inbox.add('Original question');
		await vi.waitFor(() =>
			expect(
				inbox.state.get().questions.find((q) => q.id === original)?.state.kind,
			).toBe('failed'),
		);
		await select('high');
		await inbox.retry(original);
		await vi.waitFor(() =>
			expect(
				inbox.state.get().questions.find((q) => q.id === original)?.state.kind,
			).toBe('answered'),
		);
		const next = await inbox.add('New question');
		const child = await inbox.add('Follow-up', original);
		await vi.waitFor(() =>
			expect(
				inbox.state.get().questions.every((q) => q.state.kind === 'answered'),
			).toBe(true),
		);
		expect(
			run.mock.calls.map(([request]) => request.question.reasoning),
		).toEqual(['medium', 'medium', 'high', 'high']);
		expect(
			inbox.state.get().questions.find((q) => q.id === next)?.reasoning,
		).toBe('high');
		expect(
			inbox.state.get().questions.find((q) => q.id === child)?.reasoning,
		).toBe('high');
		await inbox.actions.save({
			id: 'cards',
			name: 'Cards',
			prompt: 'Create cards',
		});
		const actionId = await inbox.actions.start(original, 'cards');
		await vi.waitFor(() =>
			expect(inbox.state.get().actionRuns[0]?.state.kind).toBe('failed'),
		);
		await select('low');
		await inbox.actions.retry(actionId);
		await vi.waitFor(() => expect(runAction).toHaveBeenCalledTimes(2));
		await vi.waitFor(() =>
			expect(inbox.state.get().actionRuns[0]?.state.kind).toBe('failed'),
		);
		await inbox.actions.dismiss(actionId);
		await inbox.actions.start(original, 'cards');
		await vi.waitFor(() => expect(runAction).toHaveBeenCalledTimes(3));
		expect(
			runAction.mock.calls.map(([request]) => request.run.reasoning),
		).toEqual(['high', 'high', 'low']);
		await inbox.dispose();
	});
	it('shows failed saves and retries the selected level without requiring another selection', async () => {
		const { inbox, persistence } = await setup();
		render(<SettingsPage inbox={inbox} />);
		vi.spyOn(persistence, 'save').mockRejectedValueOnce(new Error('Disk full'));
		await select('xhigh');
		expect(
			screen.getAllByRole('alert').map((alert) => alert.textContent),
		).toContain('Disk full');
		expect((await persistence.load()).value?.preferences.reasoning).toBe(
			'medium',
		);
		expect(
			screen.getByRole<HTMLSelectElement>('combobox', {
				name: 'Reasoning level',
			}).value,
		).toBe('xhigh');
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: 'Retry reasoning save' }),
			);
		});
		expect(screen.queryAllByRole('alert')).toEqual([]);
		expect((await persistence.load()).value?.preferences.reasoning).toBe(
			'xhigh',
		);
		await inbox.dispose();
	});
});
