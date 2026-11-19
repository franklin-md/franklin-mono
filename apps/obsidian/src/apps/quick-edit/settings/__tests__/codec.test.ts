import { describe, expect, it } from 'vitest';
import type { QuickEditPreset } from '../../presets/types.js';
import { createDefaultPresets } from '../../presets/defaults.js';
import type { LegacyPreset } from '../legacy/v3.js';
import { quickEditSettingsCodec } from '../codec.js';

// Golden v2 data: these are the saved entries shipped before Link existed.
const starters: LegacyPreset[] = [
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
// The same starters after the v4 icon migration.
const startersV4: QuickEditPreset[] = [
	{ ...starters[0]!, icon: 'lucide-expand', color: 'blue' },
	{ ...starters[1]!, icon: 'lucide-flask-conical', color: 'yellow' },
	{ ...starters[2]!, icon: 'lucide-scissors', color: 'green' },
	{ ...starters[3]!, icon: 'lucide-list-tree', color: 'purple' },
];
const model = {
	provider: 'test-provider',
	model: 'saved-model',
	reasoning: 'high' as const,
	instructions: 'Keep my wording.',
};
const custom = {
	id: 'mine',
	name: 'My edit',
	prompt: 'Follow my custom instructions.',
	icon: 'pencil',
	color: 'red',
} as const satisfies LegacyPreset;
const customV4: QuickEditPreset = { ...custom, icon: 'lucide-pencil' };

function decode(presets: LegacyPreset[], version = 2) {
	const result = quickEditSettingsCodec.decode({
		version,
		data: { ...model, presets },
	});
	if (!result.ok) throw new Error('Expected valid saved settings');
	return result.value;
}

describe('Quick Edit saved reasoning', () => {
	it('reads the retired minimal level as low in every settings version', () => {
		for (const [version, presets] of [
			[1, [custom]],
			[2, [custom]],
			[3, [custom]],
			[4, [customV4]],
		] as const) {
			const result = quickEditSettingsCodec.decode({
				version,
				data: { ...model, reasoning: 'minimal', presets },
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

	it('replaces all four unchanged v2 starters with one Link and encodes v4', () => {
		const settings = decode(starters);
		expect(settings).toEqual({ ...model, presets: createDefaultPresets() });
		expect(quickEditSettingsCodec.encode(settings)).toEqual({
			version: 4,
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
			customV4,
			...createDefaultPresets(),
			{ ...customV4, id: 'other' },
		]);
	});

	it.each([
		['id', 'my-expand', { id: 'my-expand' }],
		['name', 'Expand carefully', { name: 'Expand carefully' }],
		[
			'prompt',
			'Keep my custom expansion instructions.',
			{ prompt: 'Keep my custom expansion instructions.' },
		],
		['icon', 'pencil', { icon: 'lucide-pencil' }],
		['color', 'red', { color: 'red' }],
	] as const)(
		'preserves a starter customized only in its %s',
		(field, value, migrated) => {
			const customized = { ...starters[0]!, [field]: value };
			const saved = [customized, ...starters.slice(1)];
			expect(decode(saved).presets).toEqual([
				{ ...startersV4[0]!, ...migrated },
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
		expect(decode(saved).presets).toEqual([
			{ ...customV4, id: 'outline' },
			{ ...customV4, id: 'expand' },
			customV4,
		]);
	});

	it('preserves intentionally empty v2, v3 and v4 lists', () => {
		for (const version of [2, 3, 4])
			expect(decode([], version).presets).toEqual([]);
	});

	it('preserves custom Link IDs and gives the replacement an unused stable ID', () => {
		const saved = [
			{ ...custom, id: 'link' },
			...starters,
			{ ...custom, id: 'link-2' },
		];
		const expected = [
			{ ...customV4, id: 'link' },
			{ ...createDefaultPresets()[0]!, id: 'link-3' },
			{ ...customV4, id: 'link-2' },
		];
		expect(decode(saved).presets).toEqual(expected);
		expect(decode(saved).presets).toEqual(expected);
	});

	it('does not rerun the migration on v3 entries, even when a user recreates a retired starter', () => {
		const linkV3 = { ...createDefaultPresets()[0]!, icon: 'link' as const };
		const encoded = quickEditSettingsCodec.encode(
			decode([linkV3, ...starters], 3),
		);
		const result = quickEditSettingsCodec.decode(encoded);
		expect(result.ok && result.value.presets).toEqual([
			...createDefaultPresets(),
			...startersV4,
		]);
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

describe('Obsidian icon migration', () => {
	it.each([
		['link', 'lucide-link'],
		['expand', 'lucide-expand'],
		['flask', 'lucide-flask-conical'],
		['scissors', 'lucide-scissors'],
		['list-tree', 'lucide-list-tree'],
		['sparkles', 'lucide-sparkles'],
		['pencil', 'lucide-pencil'],
		['message-circle', 'lucide-message-circle'],
		['languages', 'lucide-languages'],
	] as const)('saves the v3 %s icon as Obsidian’s %s', (slug, id) => {
		const settings = decode([{ ...custom, icon: slug }], 3);
		expect(settings.presets).toEqual([{ ...customV4, icon: id }]);
		expect(quickEditSettingsCodec.encode(settings).version).toBe(4);
	});

	it('changes amber to yellow, which it already drew, and keeps other colors', () => {
		const saved = [
			{ ...custom, id: 'amber', color: 'amber' },
			{ ...custom, id: 'green', color: 'green' },
		] as const;
		expect(
			decode([...saved], 3).presets.map(({ id, color }) => ({ id, color })),
		).toEqual([
			{ id: 'amber', color: 'yellow' },
			{ id: 'green', color: 'green' },
		]);
	});

	it('keeps v4 icon IDs that Obsidian does not list, including old slugs', () => {
		const saved = [
			{ ...customV4, id: 'plugin', icon: 'my-plugin-icon' },
			{ ...customV4, id: 'slug', icon: 'link' },
		];
		expect(decode(saved, 4).presets).toEqual(saved);
	});

	it('rejects Obsidian IDs in v3 and retired colors in v4', () => {
		for (const [version, preset] of [
			[3, { ...custom, icon: 'lucide-link' }],
			[4, { ...customV4, color: 'amber' }],
		] as const) {
			expect(
				quickEditSettingsCodec.decode({
					version,
					data: { ...model, presets: [preset] },
				}).ok,
			).toBe(false);
		}
	});
});
