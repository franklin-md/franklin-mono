import type { QuickEditPreset } from '../presets/types.js';
import { createDefaultPresets } from '../presets/defaults.js';

function shippedStarters(): QuickEditPreset[] {
	return [
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
}

export function migratePresets(presets: QuickEditPreset[]): QuickEditPreset[] {
	// Match the complete shipped v2 entry: an ID alone does not imply ownership.
	// Keep these historical values fixed when editable defaults change again.
	const starters = shippedStarters();
	const isStarter = (preset: QuickEditPreset) =>
		starters.some((starter) =>
			(Object.keys(starter) as (keyof QuickEditPreset)[]).every(
				(key) => preset[key] === starter[key],
			),
		);
	const first = presets.findIndex(isStarter);
	if (first === -1) return presets;
	const replacements = createDefaultPresets();
	const ids = new Set(presets.map((preset) => preset.id));
	for (const preset of replacements) {
		const base = preset.id;
		let suffix = 2;
		while (ids.has(preset.id)) preset.id = `${base}-${suffix++}`;
		ids.add(preset.id);
	}
	// Replace at the first retired starter without moving the user's other entries.
	return presets.flatMap((preset, index) =>
		index === first ? replacements : isStarter(preset) ? [] : [preset],
	);
}
