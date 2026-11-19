import { memo } from 'react';
import { cn } from '../../lib/cn.js';
import type { IconOption, IconRenderer } from './types.js';

type Props = {
	id: string;
	icon: IconOption;
	active: boolean;
	selected: boolean;
	renderIcon: IconRenderer;
	onPick: (id: string) => void;
};

// Host catalogs can hold ~1,500 icons. Memoizing keeps arrow-key moves to
// re-rendering the two cells whose active state changed.
export const IconCell = memo(function IconCell({
	id,
	icon,
	active,
	selected,
	renderIcon: Icon,
	onPick,
}: Props) {
	return (
		<div
			id={id}
			role="option"
			aria-selected={selected}
			aria-label={icon.label}
			title={icon.label}
			className={cn(
				'flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent',
				selected && 'bg-accent',
				active && 'ring-1 ring-inset ring-ring',
			)}
			// Keep focus in the search input so typing and arrow keys continue there.
			onMouseDown={(event) => event.preventDefault()}
			onClick={() => onPick(icon.id)}
		>
			<Icon id={icon.id} className="size-4" />
		</div>
	);
});
