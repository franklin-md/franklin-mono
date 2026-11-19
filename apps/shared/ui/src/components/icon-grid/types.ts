import type { ComponentType } from 'react';

export type IconOption = {
	id: string;
	label: string;
	keywords?: readonly string[];
};

// Hosts supply the icon source, such as Lucide components or Obsidian's icon registry.
export type IconRenderer = ComponentType<{ id: string; className?: string }>;

export type IconGridProps = {
	icons: readonly IconOption[];
	value: string;
	onChange: (id: string) => void;
	renderIcon: IconRenderer;
	// Text-color utilities tint every icon, e.g. to preview a separately chosen color.
	className?: string;
};
