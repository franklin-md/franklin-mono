import { LoaderCircle } from 'lucide-react';
import { IconButton } from '../components/icon-button.js';
import { cn } from '../lib/cn.js';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '../primitives/tooltip.js';
import type { IconActionProps } from './action-types.js';

export function IconAction({
	action: { label, description, icon, colorClassName, selectedClassName },
	busy,
	disabled,
	focused,
	onFocus,
	onClick,
}: IconActionProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<IconButton
					icon={busy ? LoaderCircle : icon}
					iconClassName={cn(
						'shrink-0',
						busy && 'animate-spin motion-reduce:animate-none',
					)}
					aria-label={label}
					aria-description={description}
					type="button"
					variant="ghost"
					disabled={disabled}
					tabIndex={focused ? 0 : -1}
					onFocus={onFocus}
					className={cn(
						'p-0 ring-1 ring-inset',
						colorClassName,
						focused
							? (selectedClassName ?? 'bg-accent ring-ring')
							: 'ring-border',
					)}
					onClick={onClick}
				/>
			</TooltipTrigger>
			<TooltipContent
				side="top"
				collisionPadding={8}
				updatePositionStrategy="always"
				className="px-2 py-1 text-xs"
			>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}
