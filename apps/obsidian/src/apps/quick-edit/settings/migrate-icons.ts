import type { QuickEditPreset } from '../presets/types.js';
import { legacyIconIds } from './legacy/icons.js';
import type { LegacyIcon } from './legacy/icons.js';
import type { LegacyPreset } from './legacy/v3.js';

export function migratePresetIcons(
	presets: readonly LegacyPreset[],
): QuickEditPreset[] {
	return presets.map((preset) => ({
		...preset,
		// Seeded current defaults already use Obsidian IDs and pass through.
		icon: Object.hasOwn(legacyIconIds, preset.icon)
			? legacyIconIds[preset.icon as LegacyIcon]
			: preset.icon,
		// Amber already drew Obsidian's yellow, so presets look unchanged.
		color: preset.color === 'amber' ? 'yellow' : preset.color,
	}));
}
