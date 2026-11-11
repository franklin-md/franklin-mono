// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { rm } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InboxController } from '../../controller/controller.js';
import { inboxCodec } from '../../controller/schema.js';
import { InboxPanel } from '../../ui/panel.js';
import { captureSetup, cardSnapshot } from './setup.js';

vi.mock('../mochi/read.js', () => ({ readMochiCards: vi.fn() }));

const roots: string[] = [];
afterEach(async () => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	await Promise.all(
		roots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe('capture inbox controls', () => {
	it('switches recordings from another answer, survives question deletion and completes automatically without an agent action', async () => {
		HTMLElement.prototype.scrollTo = vi.fn();
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const { capture, root, readCards } = await captureSetup();
		roots.push(root);
		readCards.mockResolvedValue(cardSnapshot('chosen', 'unrelated'));
		const runAction = vi.fn();
		const onError = vi.fn();
		const inbox = await InboxController.create({
			defaults: { provider: 'test', model: 'test', reasoning: 'off' },
			capture,
			persistence: createSingleFilePersister(
				new MemoryFilesystem(),
				toAbsolutePath('/inbox.json'),
				inboxCodec,
			),
			run: async ({ submit }) => {
				await submit('The answer.');
			},
			runAction,
		});
		await inbox.add('A study question?');
		await inbox.add('Another study question?');
		await vi.waitFor(() =>
			expect(
				inbox.state.get().questions.every((q) => q.state.kind === 'answered'),
			).toBe(true),
		);
		render(
			<InboxPanel
				controller={inbox}
				onOpenSource={vi.fn()}
				onSettings={vi.fn()}
				onError={onError}
			/>,
		);
		await act(async () => {
			fireEvent.click(
				within(
					screen.getByRole('article', { name: 'Another study question?' }),
				).getByRole('button', { name: 'Record' }),
			);
		});
		expect(screen.getByText('Recording Mochi cards')).toBeTruthy();
		await vi.waitFor(() => expect(capture.state.get().busy).toBe(false));
		expect(
			screen.getByRole('button', { name: 'Record' }).hasAttribute('disabled'),
		).toBe(false);
		const firstId = capture.state.get().pending?.id;
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Record' }));
		});
		await vi.waitFor(() => expect(capture.state.get().busy).toBe(false));
		expect(capture.state.get().completed).toHaveLength(1);
		expect(capture.state.get().pending?.id).not.toBe(firstId);
		readCards.mockResolvedValue(cardSnapshot('last'));
		await act(async () => {
			await inbox.remove(capture.state.get().pending?.question.id ?? '');
		});
		expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
		readCards.mockRejectedValueOnce(new Error('Mochi database busy'));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
		});
		await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
		expect(screen.getByRole('alert').textContent).toContain(
			'Mochi database busy',
		);
		await vi.waitFor(() => expect(capture.state.get().busy).toBe(false));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Retry recording' }));
		});
		await vi.waitFor(() =>
			expect(capture.state.get().completed).toHaveLength(2),
		);
		expect(capture.state.get().pending).toBeUndefined();
		expect(
			screen.queryByRole('region', { name: 'Flashcard capture' }),
		).toBeNull();
		expect(screen.queryByText(/Save example/)).toBeNull();
		expect(runAction).not.toHaveBeenCalled();
		await act(async () => {
			await inbox.dispose();
		});
	});
});
