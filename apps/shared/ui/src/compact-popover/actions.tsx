import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { IconButton } from '../components/icon-button.js';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../primitives/tooltip.js';
import { cn } from '../lib/cn.js';
import type { IconActionGroupProps } from './types.js';

export function IconActionGroup({
	label,
	actions,
	onAction,
	busyId,
	disabled = false,
}: IconActionGroupProps) {
	const group = useRef<HTMLDivElement | null>(null);
	const [focused, setFocused] = useState(actions[0]?.id);
	useEffect(() => {
		const element = group.current;
		const win = element?.ownerDocument.defaultView;
		if (!element || !win) return;
		const handleKey = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.isComposing ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey
			)
				return;
			const buttons = Array.from(
				element.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
			);
			const index = buttons.findIndex(
				(button) => button === element.ownerDocument.activeElement,
			);
			// Only this group's focused buttons own these keys. Adjacent inputs and
			// nested pickers keep their ordinary navigation and submission behavior.
			if (index < 0) return;
			switch (event.key) {
				case 'ArrowDown':
				case 'ArrowRight':
					buttons[(index + 1) % buttons.length]?.focus();
					break;
				case 'ArrowUp':
				case 'ArrowLeft':
					buttons[(index + buttons.length - 1) % buttons.length]?.focus();
					break;
				case 'Home':
					buttons[0]?.focus();
					break;
				case 'End':
					buttons.at(-1)?.focus();
					break;
				case 'Enter':
				case ' ':
					buttons[index]?.click();
					break;
				default:
					return;
			}
			event.preventDefault();
			event.stopPropagation();
		};
		// Capture before host hotkeys and React portal delegation.
		win.addEventListener('keydown', handleKey, true);
		return () => win.removeEventListener('keydown', handleKey, true);
	}, []);
	return (
		<TooltipProvider delayDuration={300}>
			<div
				ref={group}
				role="toolbar"
				aria-label={label}
				aria-orientation="horizontal"
				className="flex items-center gap-1"
			>
				{actions.map(
					({
						id,
						label,
						description,
						icon,
						colorClassName,
						selectedClassName,
					}) => (
						<Tooltip key={id}>
							<TooltipTrigger asChild>
								<IconButton
									icon={busyId === id ? LoaderCircle : icon}
									iconClassName={cn(
										'shrink-0',
										busyId === id && 'animate-spin motion-reduce:animate-none',
									)}
									aria-label={label}
									aria-description={description}
									type="button"
									variant="ghost"
									disabled={disabled}
									tabIndex={focused === id ? 0 : -1}
									onFocus={() => setFocused(id)}
									className={cn(
										'p-0 ring-1 ring-inset',
										colorClassName,
										focused === id
											? (selectedClassName ?? 'bg-accent ring-ring')
											: 'ring-border',
									)}
									onClick={() => onAction(id)}
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
					),
				)}
			</div>
		</TooltipProvider>
	);
}
