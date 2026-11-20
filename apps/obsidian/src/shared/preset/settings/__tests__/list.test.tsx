// @vitest-environment jsdom
import { useSyncExternalStore } from 'react';
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createStore } from '@franklin/agent';
import type { PromptPreset } from '../../types.js';
import { PresetList } from '../list.js';

const link: PromptPreset = {
	id: 'link',
	name: 'Link',
	prompt: 'Link a related note.',
	icon: 'lucide-link',
	color: 'blue',
};

// Stands in for an owner's persisted store: each update applies to its latest list.
function createPresets(save = vi.fn(async (_presets: PromptPreset[]) => {})) {
	const store = createStore([link]);
	async function update(change: (current: PromptPreset[]) => PromptPreset[]) {
		const next = change(store.get());
		await save(next);
		store.set(() => next);
	}
	function Owner() {
		const presets = useSyncExternalStore(
			(notify) => store.subscribe(notify),
			() => store.get(),
		);
		return <PresetList noun="preset" presets={presets} onUpdate={update} />;
	}
	return { store, save, Owner };
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
	const { store, Owner } = createPresets();
	render(<Owner />);
	fireEvent.click(screen.getByRole('button', { name: 'Add preset' }));
	const form = within(screen.getByRole('form', { name: 'Edit preset' }));
	const save = form.getByRole('button', { name: 'Save preset' });
	expect(save).toHaveProperty('disabled', true);
	fireEvent.change(form.getByLabelText('Preset name'), {
		target: { value: 'Explain' },
	});
	expect(save).toHaveProperty('disabled', true);
	fireEvent.change(form.getByLabelText('Preset prompt'), {
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
		expect(store.get().at(-1)).toMatchObject({
			name: 'Explain',
			prompt: 'Explain this point.',
			icon: 'lucide-pencil',
			color: 'green',
		}),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Move Explain up' }));
	await vi.waitFor(() => expect(store.get().at(-2)?.name).toBe('Explain'));
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
	await vi.waitFor(() => expect(store.get()).toEqual([link]));
});

it('closes the picker on Escape and discards the draft on Cancel', async () => {
	const { store, Owner } = createPresets();
	render(<Owner />);
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
	expect(store.get()).toEqual([link]);
});

it('keeps a draft and its ID when saving fails, then saves it once', async () => {
	const save = vi.fn(async (_presets: PromptPreset[]) => {});
	const { store, Owner } = createPresets(save);
	render(<Owner />);
	fireEvent.click(screen.getByRole('button', { name: 'Add preset' }));
	fireEvent.change(screen.getByLabelText('Preset name'), {
		target: { value: 'Cards' },
	});
	fireEvent.change(screen.getByLabelText('Preset prompt'), {
		target: { value: 'Keep my draft' },
	});
	save.mockRejectedValueOnce(new Error('Disk full'));
	const submit = screen.getByRole('button', { name: 'Save preset' });
	await vi.waitFor(() => expect(submit).toHaveProperty('disabled', false));
	fireEvent.click(submit);
	expect((await screen.findByRole('alert')).textContent).toBe('Disk full');
	expect(screen.getByLabelText('Preset prompt')).toHaveProperty(
		'value',
		'Keep my draft',
	);
	fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
	await vi.waitFor(() => expect(store.get()).toHaveLength(2));
	expect(screen.queryByRole('alert')).toBe(null);
	expect(save.mock.calls[0]?.[0].at(-1)?.id).toBe(
		save.mock.calls[1]?.[0].at(-1)?.id,
	);
});
