import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
	Button,
	Popover,
	PopoverContent,
	PopoverTrigger,
	cn,
} from '@franklin/ui';
import { ObsidianIcon } from '../../../ui/icon/index.js';

type Props = {
	icon: string;
	tint: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
};

// A container: the trigger previews the tinted icon, and the editor binds each
// picker inside to its own form field.
// TODO: Escape in this popover closes the whole Obsidian settings window.
// Obsidian's keymap handles keydown on the window in the capture phase, before
// Radix. The popover portals to document.body, outside the settings tab
// content, so the settings modal's onEscapeKey closes the modal (Obsidian
// 1.15.1). ModelPicker in settings shares the problem. Fix it in the settings
// host (plugin/settings/tab.tsx): while the tab is shown, push an Obsidian
// Scope whose Escape handler lets the event reach Radix when focus is inside
// the Franklin portal root, and defers to the parent scope otherwise.
export function AppearancePopover({
	icon,
	tint,
	open,
	onOpenChange,
	children,
}: Props) {
	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					aria-label="Icon and color"
					className="shrink-0 gap-1 px-2"
				>
					<ObsidianIcon id={icon} className={cn('size-4', tint)} />
					<ChevronDown aria-hidden="true" className="size-3 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				aria-label="Icon and color"
				collisionPadding={8}
				className="flex max-h-[var(--radix-popover-content-available-height)] w-max flex-col overflow-hidden"
			>
				{children}
			</PopoverContent>
		</Popover>
	);
}
