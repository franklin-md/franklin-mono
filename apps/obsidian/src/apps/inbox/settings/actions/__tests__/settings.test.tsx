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
import { InboxController } from '../../../controller/index.js';
import { inboxCodec } from '../../../controller/schema.js';
import { InboxActionSettings } from '../settings.js';

afterEach(cleanup);

async function setup() {
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
	return { disk, inbox };
}

async function fillDraft(name: string, prompt: string) {
	fireEvent.change(screen.getByRole('textbox', { name: 'Action name' }), {
		target: { value: name },
	});
	fireEvent.change(screen.getByRole('textbox', { name: 'Action prompt' }), {
		target: { value: prompt },
	});
	const save = screen.getByRole('button', { name: 'Save action' });
	await vi.waitFor(() => expect(save).toHaveProperty('disabled', false));
	return save;
}

describe('inbox action settings', () => {
	it('adds, renames and deletes a persisted action with an icon and color, retaining its ID', async () => {
		const { disk, inbox } = await setup();
		render(<InboxActionSettings inbox={inbox} />);
		fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
		expect(screen.getByRole('button', { name: 'Save action' })).toHaveProperty(
			'disabled',
			true,
		);
		const save = await fillDraft(
			'🃏',
			'Read [[Workflow Guide]] and append proposals.',
		);
		await act(async () => {
			fireEvent.click(save);
		});
		const id = inbox.state.get().actions[0]?.id;
		expect(id).toBeTruthy();
		expect((await disk.load()).value?.actions).toEqual([
			{
				id,
				name: '🃏',
				prompt: 'Read [[Workflow Guide]] and append proposals.',
				icon: 'lucide-sparkles',
				color: 'blue',
			},
		]);
		fireEvent.click(screen.getByRole('button', { name: 'Edit 🃏' }));
		fireEvent.change(screen.getByRole('textbox', { name: 'Action name' }), {
			target: { value: 'Cards' },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
		});
		expect(inbox.state.get().actions[0]?.id).toBe(id);
		expect((await disk.load()).value?.actions[0]?.name).toBe('Cards');
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Delete Cards' }));
		});
		expect((await disk.load()).value?.actions).toEqual([]);
		await inbox.dispose();
	});

	it('preserves a draft and its identity when saving fails', async () => {
		const { disk, inbox } = await setup();
		render(<InboxActionSettings inbox={inbox} />);
		fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
		const save = await fillDraft('🃏', 'Keep my draft');
		vi.spyOn(disk, 'save').mockRejectedValueOnce(new Error('Disk full'));
		await act(async () => {
			fireEvent.click(save);
		});
		expect(
			screen
				.getAllByRole('alert')
				.some((node) => node.textContent.includes('Disk full')),
		).toBe(true);
		// A failed save keeps the draft editor open and reuses its reserved ID.
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
		});
		expect(inbox.state.get().actions).toHaveLength(1);
		expect((await disk.load()).value?.actions[0]?.prompt).toBe('Keep my draft');
		await inbox.dispose();
	});
});
