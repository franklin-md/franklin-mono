import { describe, expect, it } from 'vitest';
import type { QuickEditPreset } from '../../presets/types.js';
import { createDefaultPresets } from '../../presets/defaults.js';
import { quickEditSettingsCodec } from '../codec.js';

// Golden v2 data: these are the saved entries shipped before Link existed.
const starters: QuickEditPreset[] = [
	{
		id: 'expand',
		name: 'Expand',
		prompt:
			'Expand the selected passage or current point with useful detail. Preserve the existing outline and writing style.',
		icon: 'expand',
		color: 'blue',
	},
	{
		id: 'example',
		name: 'Add example',
		prompt:
			'Add a concrete example beneath the selected passage or current point. Keep it concise and preserve the existing outline.',
		icon: 'flask',
		color: 'amber',
	},
	{
		id: 'condense',
		name: 'Condense',
		prompt:
			'Make the selected passage or current point more concise while preserving its meaning, qualifications, links, and outline structure.',
		icon: 'scissors',
		color: 'green',
	},
	{
		id: 'outline',
		name: 'Outline',
		prompt:
			'Organize the selected passage or current point into a clear nested bullet outline. Preserve its meaning, important details, and links.',
		icon: 'list-tree',
		color: 'purple',
	},
];
const model = {
	provider: 'test-provider',
	model: 'saved-model',
	reasoning: 'high' as const,
	instructions: 'Keep my wording.',
};
const custom: QuickEditPreset = {
	id: 'mine',
	name: 'My edit',
	prompt: 'Follow my custom instructions.',
	icon: 'pencil',
	color: 'red',
};

function decode(presets: QuickEditPreset[], version = 2) {
	const result = quickEditSettingsCodec.decode({
		version,
		data: { ...model, presets },
	});
	if (!result.ok) throw new Error('Expected valid saved settings');
	return result.value;
}

describe('Quick Edit saved reasoning', () => {
	it('reads the retired minimal level as low in every settings version', () => {
		for (const version of [1, 2, 3]) {
			const result = quickEditSettingsCodec.decode({
				version,
				data: { ...model, reasoning: 'minimal', presets: [custom] },
			});
			expect(result.ok && result.value.reasoning).toBe('low');
		}
	});
});

describe('Link settings migration', () => {
	it('seeds v1 settings and missing v2 presets with Link without changing other settings', () => {
		for (const version of [1, 2]) {
			const result = quickEditSettingsCodec.decode({ version, data: model });
			expect(result.ok && result.value).toEqual({
				...model,
				presets: createDefaultPresets(),
			});
		}
	});

	it('replaces all four unchanged v2 starters with one Link and encodes v3', () => {
		const settings = decode(starters);
		expect(settings).toEqual({ ...model, presets: createDefaultPresets() });
		expect(quickEditSettingsCodec.encode(settings)).toEqual({
			version: 3,
			data: settings,
		});
	});

	it('replaces reordered and partially deleted starters at the first surviving starter', () => {
		const saved = [
			custom,
			starters[3]!,
			{ ...custom, id: 'other' },
			starters[0]!,
		];
		expect(decode(saved).presets).toEqual([
			custom,
			...createDefaultPresets(),
			{ ...custom, id: 'other' },
		]);
	});

	it.each([
		['id', 'my-expand'],
		['name', 'Expand carefully'],
		['prompt', 'Keep my custom expansion instructions.'],
		['icon', 'pencil'],
		['color', 'red'],
	] as const)(
		'preserves a starter customized only in its %s',
		(field, value) => {
			const customized = { ...starters[0]!, [field]: value };
			const saved = [customized, ...starters.slice(1)];
			expect(decode(saved).presets).toEqual([
				customized,
				...createDefaultPresets(),
			]);
		},
	);

	it('preserves a custom-only list and its order, including reused starter IDs', () => {
		const saved = [
			{ ...custom, id: 'outline' },
			{ ...custom, id: 'expand' },
			custom,
		];
		expect(decode(saved).presets).toEqual(saved);
	});

	it('preserves intentionally empty v2 and v3 lists', () => {
		for (const version of [2, 3])
			expect(decode([], version).presets).toEqual([]);
	});

	it('preserves custom Link IDs and gives the replacement an unused stable ID', () => {
		const saved = [
			{ ...custom, id: 'link' },
			...starters,
			{ ...custom, id: 'link-2' },
		];
		const expected = [
			{ ...custom, id: 'link' },
			{ ...createDefaultPresets()[0]!, id: 'link-3' },
			{ ...custom, id: 'link-2' },
		];
		expect(decode(saved).presets).toEqual(expected);
		expect(decode(saved).presets).toEqual(expected);
	});

	it('does not rerun the migration on v3 entries, even when a user recreates a retired starter', () => {
		const saved = [...createDefaultPresets(), ...starters];
		const encoded = quickEditSettingsCodec.encode(decode(saved, 3));
		const result = quickEditSettingsCodec.decode(encoded);
		expect(result.ok && result.value.presets).toEqual(saved);
	});

	it('rejects malformed saved presets instead of replacing user data', () => {
		for (const presets of [
			[custom, custom],
			[{ ...custom, icon: 'unknown' }],
		]) {
			expect(
				quickEditSettingsCodec.decode({
					version: 2,
					data: { ...model, presets },
				}).ok,
			).toBe(false);
		}
	});
});
