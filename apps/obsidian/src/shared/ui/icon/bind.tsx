import type { ComponentType } from 'react';
import { ObsidianIcon } from './index.js';

type Props = { className?: string };

// Adapts an ID for APIs that take an icon component, such as IconActionGroup.
// Keep the result: a new component on each render remounts the icon.
export function bindObsidianIcon(id: string): ComponentType<Props> {
	return function BoundObsidianIcon({ className }: Props) {
		return <ObsidianIcon id={id} className={className} />;
	};
}
