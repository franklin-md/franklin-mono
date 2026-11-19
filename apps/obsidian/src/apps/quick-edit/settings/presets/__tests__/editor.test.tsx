// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { QuickEditPreferences } from '../../store.js';
import { quickEditSettingsCodec } from '../../codec.js';
import { createDefaultPresets } from '../../../presets/defaults.js';
import { PresetSettings } from '../list.js';

const defaults = {
	provider: 'test',
	model: 'test',
	reasoning: 'off' as const,
	instructions: '',
};

function createPreferences() {
	const storage = createSingleFilePersister(
		new MemoryFilesystem(),
		toAbsolutePath('/quick-edit.json'),
		quickEditSettingsCodec,
	);
	return { storage, opened: QuickEditPreferences.create(storage, defaults) };
}

// jsdom has no layout or ResizeObserver. Radix positions the popover with
// ResizeObserver, and IconGrid renders only the rows that fit its viewport.
beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
	vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(256);
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(34);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it('adds, customizes, reorders and deletes saved presets', async () => {
	const { storage, opened } = createPreferences();
	const preferences = await opened;
	render(<PresetSettings preferences={preferences} />);
	fireEvent.click(screen.getByRole('button', { name: 'Add preset' }));
	const form = within(screen.getByRole('form', { name: 'Edit preset' }));
	const save = form.getByRole('button', { name: 'Save preset' });
	expect(save).toHaveProperty('disabled', true);
	fireEvent.change(form.getByLabelText('Preset name'), {
		target: { value: 'Explain' },
	});
	expect(save).toHaveProperty('disabled', true);
	fireEvent.change(form.getByLabelText('Prompt'), {
		target: { value: 'Explain this point.' },
	});
	await vi.waitFor(() => expect(save).toHaveProperty('disabled', false));

	const trigger = form.getByRole('button', { name: 'Icon and color' });
	fireEvent.click(trigger);
	// Changing color keeps the picker open; picking an icon closes it.
	fireEvent.click(await screen.findByRole('radio', { name: 'Green' }));
	expect(screen.getByRole('radio', { name: 'Green' })).toHaveProperty(
		'ariaChecked',
		'true',
	);
	fireEvent.click(screen.getByRole('gridcell', { name: 'Pencil' }));
	await vi.waitFor(() =>
		expect(screen.queryByRole('searchbox', { name: 'Search icons' })).toBe(
			null,
		),
	);

	fireEvent.click(save);
	await vi.waitFor(() =>
		expect(preferences.state.get().presets.at(-1)).toMatchObject({
			name: 'Explain',
			prompt: 'Explain this point.',
			icon: 'lucide-pencil',
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
		expect(preferences.state.get().presets).toHaveLength(1),
	);
	expect(
		(await QuickEditPreferences.create(storage, defaults)).state.get().presets,
	).toEqual(preferences.state.get().presets);
	await preferences.dispose();
});

it('closes the picker on Escape and discards the draft on Cancel', async () => {
	const preferences = await createPreferences().opened;
	render(<PresetSettings preferences={preferences} />);
	fireEvent.click(screen.getByRole('button', { name: 'Edit Link' }));
	fireEvent.change(screen.getByLabelText('Preset name'), {
		target: { value: 'Renamed' },
	});
	const trigger = screen.getByRole('button', { name: 'Icon and color' });
	fireEvent.click(trigger);
	const search = await screen.findByRole('searchbox', { name: 'Search icons' });
	expect(document.activeElement).toBe(search);
	fireEvent.click(screen.getByRole('radio', { name: 'Pink' }));
	fireEvent.keyDown(document.activeElement ?? document.body, {
		key: 'Escape',
	});
	await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
	expect(screen.queryByRole('searchbox', { name: 'Search icons' })).toBe(null);
	// The draft survives closing the picker; Cancel discards it unsaved.
	expect(screen.getByLabelText('Preset name')).toHaveProperty(
		'value',
		'Renamed',
	);
	fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
	expect(screen.queryByRole('form', { name: 'Edit preset' })).toBe(null);
	expect(preferences.state.get().presets).toEqual(createDefaultPresets());
	await preferences.dispose();
});
