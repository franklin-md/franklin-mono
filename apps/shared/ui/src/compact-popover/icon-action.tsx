import * as RovingFocusGroup from '@radix-ui/react-roving-focus';
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
	action: { id, label, description, icon, colorClassName, selectedClassName },
	busy,
	disabled,
	onClick,
}: IconActionProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<RovingFocusGroup.Item asChild tabStopId={id} focusable={!disabled}>
					{({ isCurrentTabStop }) => (
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
							className={cn(
								'p-0 ring-1 ring-inset',
								colorClassName,
								isCurrentTabStop
									? (selectedClassName ?? 'bg-accent ring-ring')
									: 'ring-border',
							)}
							onClick={onClick}
						/>
					)}
				</RovingFocusGroup.Item>
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
