import { useCallback, useRef, useState } from 'react';
import { TooltipProvider } from '../primitives/tooltip.js';
import type { IconActionGroupProps } from './action-types.js';
import { IconAction } from './icon-action.js';
import { useIconActionKeys } from './use-icon-action-keys.js';

export function IconActionGroup({
	label,
	actions,
	onAction,
	busyId,
	disabled = false,
}: IconActionGroupProps) {
	const group = useRef<HTMLDivElement | null>(null);
	const [focused, setFocused] = useState(actions[0]?.id);
	const getButtons = useCallback(
		() =>
			Array.from(
				group.current?.querySelectorAll<HTMLButtonElement>(
					'button:not([disabled])',
				) ?? [],
			),
		[],
	);
	const focusAtIndex = useCallback(
		(index: number) => {
			getButtons()[index]?.focus();
		},
		[getButtons],
	);
	useIconActionKeys({ group, getButtons, focusAtIndex });
	return (
		<TooltipProvider delayDuration={300}>
			<div
				ref={group}
				role="toolbar"
				aria-label={label}
				aria-orientation="horizontal"
				className="flex items-center gap-1"
			>
				{actions.map((action) => (
					<IconAction
						key={action.id}
						action={action}
						busy={busyId === action.id}
						disabled={disabled}
						focused={focused === action.id}
						onFocus={() => setFocused(action.id)}
						onClick={() => onAction(action.id)}
					/>
				))}
			</div>
		</TooltipProvider>
	);
}
