import { memo } from 'react';
import type { GridCellProps } from '@franklin/react';
import { cn } from '../../lib/cn.js';
import type { IconOption, IconRenderer } from './types.js';

type Props = GridCellProps & {
	icon: IconOption;
	active: boolean;
	selected: boolean;
	renderIcon: IconRenderer;
	onPick: (id: string) => void;
};

// Host catalogs can hold ~1,500 icons. Memoizing keeps arrow-key moves to
// re-rendering the two cells whose active state changed.
export const IconCell = memo(function IconCell({
	icon,
	active,
	selected,
	renderIcon: Icon,
	onPick,
	...cell
}: Props) {
	return (
		<div
			{...cell}
			aria-selected={selected}
			aria-label={icon.label}
			title={icon.label}
			className={cn(
				'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none hover:bg-accent',
				selected && 'bg-accent',
				active && 'ring-1 ring-inset ring-ring',
			)}
			onClick={() => onPick(icon.id)}
		>
			<Icon id={icon.id} className="size-4" />
		</div>
	);
});
