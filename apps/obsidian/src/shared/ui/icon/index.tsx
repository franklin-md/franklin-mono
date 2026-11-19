import { useLayoutEffect, useRef } from 'react';
import { setIcon } from 'obsidian';
import { cn } from '@franklin/ui';

type Props = { id: string; className?: string };

// Saved IDs can outlive the plugin that registered them with `addIcon`.
const fallbackIcon = 'lucide-circle-help';

// Draws from Obsidian's registry: bundled Lucide icons as `lucide-<name>`,
// Obsidian's own icons and plugin icons. Lucide-react would add ~290 B per icon.
// https://docs.obsidian.md/Plugins/User+interface/Icons
export function ObsidianIcon({ id, className }: Props) {
	const host = useRef<HTMLSpanElement>(null);
	useLayoutEffect(() => {
		const element = host.current;
		if (!element) return;
		setIcon(element, id);
		if (!element.firstChild) setIcon(element, fallbackIcon);
	}, [id]);
	// Obsidian sizes `.svg-icon` from --icon-size; fill this box instead so
	// callers size icons with the same utilities as Lucide components.
	return (
		<span
			ref={host}
			aria-hidden="true"
			className={cn('inline-flex shrink-0 [&>svg]:size-full', className)}
		/>
	);
}
