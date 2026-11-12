// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { QuickEditPreferences } from '../../store.js';
import { quickEditSettingsCodec } from '../../codec.js';
import { PresetSettings } from '../list.js';

afterEach(cleanup);
it('adds, customizes, reorders and deletes saved presets', async () => {
	const storage = createSingleFilePersister(
		new MemoryFilesystem(),
		toAbsolutePath('/quick-edit.json'),
		quickEditSettingsCodec,
	);
	const preferences = await QuickEditPreferences.create(storage, {
		provider: 'test',
		model: 'test',
		reasoning: 'off',
		instructions: '',
	});
	render(<PresetSettings preferences={preferences} />);
	fireEvent.click(screen.getByRole('button', { name: 'Add preset' }));
	const form = within(screen.getByRole('form', { name: 'Edit preset' }));
	fireEvent.change(form.getByLabelText('Preset name'), {
		target: { value: 'Explain' },
	});
	fireEvent.change(form.getByLabelText('Prompt'), {
		target: { value: 'Explain this point.' },
	});
	fireEvent.change(form.getByLabelText('Icon'), { target: { value: 'flask' } });
	fireEvent.change(form.getByLabelText('Color'), {
		target: { value: 'green' },
	});
	fireEvent.click(form.getByRole('button', { name: 'Save preset' }));
	await vi.waitFor(() =>
		expect(preferences.state.get().presets.at(-1)).toMatchObject({
			name: 'Explain',
			prompt: 'Explain this point.',
			icon: 'flask',
			color: 'green',
		}),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Move Explain up' }));
	await vi.waitFor(() =>
		expect(preferences.state.get().presets.at(-2)?.name).toBe('Explain'),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Edit Explain' }));
	fireEvent.change(screen.getByLabelText('Preset name'), {
		target: { value: 'Explain clearly' },
	});
	fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
	await vi.waitFor(() =>
		expect(
			screen.getByRole('button', { name: 'Delete Explain clearly' }),
		).toBeTruthy(),
	);
	fireEvent.click(
		screen.getByRole('button', { name: 'Delete Explain clearly' }),
	);
	await vi.waitFor(() =>
		expect(preferences.state.get().presets).toHaveLength(4),
	);
	expect(
		(
			await QuickEditPreferences.create(storage, {
				provider: 'test',
				model: 'test',
				reasoning: 'off',
				instructions: '',
			})
		).state.get().presets,
	).toEqual(preferences.state.get().presets);
	await preferences.dispose();
});
