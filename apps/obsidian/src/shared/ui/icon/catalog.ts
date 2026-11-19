import { getIconIds } from 'obsidian';
import type { IconOption } from '@franklin/ui';

// Obsidian 1.15 returns bundled Lucide icons (up to Lucide 0.446) as
// `lucide-<name>`, followed by Obsidian's own and plugin-registered icons.
// Call this when a picker opens: plugins can register icons at any time.
export function listObsidianIcons(): IconOption[] {
	return getIconIds().map((id) => ({
		id,
		label: id
			.replace(/^lucide-/, '')
			.replace(/[-_]+/g, ' ')
			.replace(/^./, (first) => first.toUpperCase()),
	}));
}
