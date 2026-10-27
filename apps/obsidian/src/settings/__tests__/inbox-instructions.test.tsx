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
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../../inbox/answer-instructions.js';
import { InboxInstructionsSetting } from '../inbox-instructions.js';

afterEach(cleanup);

async function setup() {
	const persistence = createSingleFilePersister(
		new MemoryFilesystem(),
		toAbsolutePath('/inbox.json'),
		inboxCodec,
	);
	const inbox = await InboxController.create({
		defaults: { provider: 'test', model: 'test', reasoning: 'off' },
		persistence,
		run: vi.fn(),
	});
	return { inbox, persistence };
}

describe('inbox answer instructions setting', () => {
	it('saves replacement text, restores it on reopening, and resets the saved default', async () => {
		const { inbox, persistence } = await setup();
		const { unmount } = render(<InboxInstructionsSetting inbox={inbox} />);
		const input = screen.getByRole<HTMLTextAreaElement>('textbox', {
			name: 'Answer instructions',
		});
		expect(input.value).toBe(DEFAULT_ANSWER_INSTRUCTIONS);
		const custom = 'Explain step by step.\nUse a small C example.';
		fireEvent.change(input, { target: { value: custom } });
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: 'Save instructions' }),
			);
		});
		expect(
			(await persistence.load()).value?.preferences.answerInstructions,
		).toBe(custom);
		unmount();
		render(<InboxInstructionsSetting inbox={inbox} />);
		expect(
			screen.getByRole<HTMLTextAreaElement>('textbox', {
				name: 'Answer instructions',
			}).value,
		).toBe(custom);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
		});
		expect(
			(await persistence.load()).value?.preferences.answerInstructions,
		).toBe(DEFAULT_ANSWER_INSTRUCTIONS);
		expect(
			screen.getByRole<HTMLTextAreaElement>('textbox', {
				name: 'Answer instructions',
			}).value,
		).toBe(DEFAULT_ANSWER_INSTRUCTIONS);
		await inbox.dispose();
	});

	it('retains replacement text after a failed save and allows saving it again', async () => {
		const { inbox, persistence } = await setup();
		render(<InboxInstructionsSetting inbox={inbox} />);
		fireEvent.change(
			screen.getByRole('textbox', { name: 'Answer instructions' }),
			{ target: { value: 'Keep this wording.' } },
		);
		vi.spyOn(persistence, 'save').mockRejectedValueOnce(new Error('Disk full'));
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: 'Save instructions' }),
			);
		});
		expect(screen.getByRole('alert').textContent).toBe('Disk full');
		expect(
			screen.getByRole<HTMLTextAreaElement>('textbox', {
				name: 'Answer instructions',
			}).value,
		).toBe('Keep this wording.');
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: 'Save instructions' }),
			);
		});
		expect(screen.queryByRole('alert')).toBeNull();
		expect(
			(await persistence.load()).value?.preferences.answerInstructions,
		).toBe('Keep this wording.');
		await inbox.dispose();
	});
});
