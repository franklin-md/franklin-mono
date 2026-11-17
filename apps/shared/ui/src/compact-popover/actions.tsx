import * as RovingFocusGroup from '@radix-ui/react-roving-focus';
import { TooltipProvider } from '../primitives/tooltip.js';
import type { IconActionGroupProps } from './action-types.js';
import { IconAction } from './icon-action.js';

export function IconActionGroup({
	label,
	actions,
	onAction,
	busyId,
	disabled = false,
}: IconActionGroupProps) {
	// Leave orientation unset so both arrow-key pairs navigate this horizontal group.
	return (
		<TooltipProvider delayDuration={300}>
			<RovingFocusGroup.Root
				role="toolbar"
				aria-label={label}
				aria-orientation="horizontal"
				className="flex items-center gap-1"
				loop
				defaultCurrentTabStopId={actions[0]?.id}
			>
				{actions.map((action) => (
					<IconAction
						key={action.id}
						action={action}
						busy={busyId === action.id}
						disabled={disabled}
						onClick={() => onAction(action.id)}
					/>
				))}
			</RovingFocusGroup.Root>
		</TooltipProvider>
	);
}
