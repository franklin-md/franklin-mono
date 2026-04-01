import type { ExtraProps } from 'streamdown';

import { cn } from '@/lib/utils.js';

type TableProps = React.JSX.IntrinsicElements['table'] & ExtraProps;

export function Table({
	children,
	className,
	node: _node,
	...props
}: TableProps) {
	return (
		<div className="my-2 w-full overflow-x-auto">
			<table
				className={cn('w-full border-collapse text-sm', className)}
				{...props}
			>
				{children}
			</table>
		</div>
	);
}
