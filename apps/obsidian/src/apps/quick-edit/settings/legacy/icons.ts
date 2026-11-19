// Storage versions 1-3 saved slugs from a curated Lucide catalog; version 4
// saves Obsidian icon IDs. Obsidian registers each bundled Lucide icon as
// `lucide-<name>`. All nine IDs below are in Obsidian 1.15.1's bundled set
// (checked in its app bundle, 2026-11-19). Keep these fixed.
// https://docs.obsidian.md/Plugins/User+interface/Icons
export const legacyIconIds = {
	link: 'lucide-link',
	expand: 'lucide-expand',
	flask: 'lucide-flask-conical',
	scissors: 'lucide-scissors',
	'list-tree': 'lucide-list-tree',
	sparkles: 'lucide-sparkles',
	pencil: 'lucide-pencil',
	'message-circle': 'lucide-message-circle',
	languages: 'lucide-languages',
} as const;

export type LegacyIcon = keyof typeof legacyIconIds;
