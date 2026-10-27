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
import { inboxCodec } from '../../inbox/controller/schema.js';
import { InboxActionSettings } from '../inbox-actions/settings.js';

afterEach(cleanup);

describe('inbox action settings', () => {
	it('adds, renames and deletes a persisted name/prompt definition while retaining its ID', async () => {
		const disk = createSingleFilePersister(
			new MemoryFilesystem(),
			toAbsolutePath('/inbox.json'),
			inboxCodec,
		);
		const inbox = await InboxController.create({
			defaults: { provider: 'test', model: 'test', reasoning: 'off' },
			persistence: disk,
			run: vi.fn(),
		});
		render(<InboxActionSettings inbox={inbox} />);
		fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
		expect(
			screen
				.getByRole('button', { name: 'Save action' })
				.hasAttribute('disabled'),
		).toBe(true);
		fireEvent.change(screen.getByRole('textbox', { name: 'Action name' }), {
			target: { value: '🃏' },
		});
		fireEvent.change(screen.getByRole('textbox', { name: 'Action prompt' }), {
			target: {
				value: 'Read [[Flashcard Design Prompt]] and append proposals.',
			},
		});
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
		});
		const id = inbox.state.get().actions[0]?.id;
		expect(id).toBeTruthy();
		expect((await disk.load()).value?.actions[0]?.name).toBe('🃏');
		fireEvent.change(screen.getByRole('textbox', { name: 'Action name' }), {
			target: { value: 'Cards' },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
		});
		expect(inbox.state.get().actions[0]?.id).toBe(id);
		expect((await disk.load()).value?.actions[0]?.name).toBe('Cards');
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Delete action' }));
		});
		expect((await disk.load()).value?.actions).toEqual([]);
		await inbox.dispose();
	});

	it('preserves a draft and its identity when saving fails', async () => {
		const disk = createSingleFilePersister(
			new MemoryFilesystem(),
			toAbsolutePath('/inbox.json'),
			inboxCodec,
		);
		const inbox = await InboxController.create({
			defaults: { provider: 'test', model: 'test', reasoning: 'off' },
			persistence: disk,
			run: vi.fn(),
		});
		render(<InboxActionSettings inbox={inbox} />);
		fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
		fireEvent.change(screen.getByRole('textbox', { name: 'Action name' }), {
			target: { value: '🃏' },
		});
		fireEvent.change(screen.getByRole('textbox', { name: 'Action prompt' }), {
			target: { value: 'Keep my draft' },
		});
		vi.spyOn(disk, 'save').mockRejectedValueOnce(new Error('Disk full'));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
		});
		expect(
			screen
				.getAllByRole('alert')
				.some((node) => node.textContent.includes('Disk full')),
		).toBe(true);
		// A failed save keeps one draft editor and reuses its reserved ID.
		await act(async () => {
			const save = screen
				.getAllByRole('button', { name: 'Save action' })
				.at(-1);
			if (!save) throw new Error('Save action button missing');
			fireEvent.click(save);
		});
		expect(inbox.state.get().actions).toHaveLength(1);
		expect((await disk.load()).value?.actions[0]?.prompt).toBe('Keep my draft');
		await inbox.dispose();
	});
});
