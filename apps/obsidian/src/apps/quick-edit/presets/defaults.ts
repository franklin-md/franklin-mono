import type { QuickEditPreset } from './types.js';

export function createDefaultPresets(): QuickEditPreset[] {
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
