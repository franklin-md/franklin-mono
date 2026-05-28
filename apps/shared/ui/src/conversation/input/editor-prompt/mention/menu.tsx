import type { RefObject } from 'react';

import type { FileReferenceItem } from '@franklin/react';

import { FileBadge } from '../../../../components/file-icon/badge.js';
import { cn } from '../../../../lib/cn.js';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from '../../../../primitives/command.js';
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from '../../../../primitives/popover.js';

import type { MentionSuggestionState } from './menu-controller.js';

interface MentionMenuProps {
	readonly suggestion: MentionSuggestionState;
	readonly items: readonly FileReferenceItem[];
	readonly onHighlight: (index: number) => void;
}

interface VirtualAnchor {
	readonly getBoundingClientRect: () => DOMRect;
}

export function MentionMenu({
	suggestion,
	items,
	onHighlight,
}: MentionMenuProps) {
	if (!suggestion.active || !suggestion.anchorRect) {
		return null;
	}

	const anchorRect = suggestion.anchorRect;
	const anchorRef: RefObject<VirtualAnchor> = {
		current: {
			getBoundingClientRect: () => anchorRect,
		},
	};
	const highlightedItem = items[suggestion.highlightedIndex];

	return (
		<Popover open>
			<PopoverAnchor virtualRef={anchorRef} />
			<PopoverContent
				align="start"
				className="w-80 p-0"
				collisionPadding={8}
				onCloseAutoFocus={(event) => event.preventDefault()}
				onMouseDown={(event) => event.preventDefault()}
				onOpenAutoFocus={(event) => event.preventDefault()}
				side="top"
				sideOffset={6}
			>
				<Command
					shouldFilter={false}
					value={highlightedItem?.path ?? ''}
					className="rounded-lg"
				>
					<CommandList className="max-h-72">
						{items.length === 0 ? (
							<CommandEmpty>No files found</CommandEmpty>
						) : (
							<CommandGroup>
								{items.map((item, index) => (
									<CommandItem
										key={item.path}
										value={item.path}
										onMouseEnter={() => onHighlight(index)}
										onSelect={() => suggestion.command(item)}
										className={cn(
											'min-w-0',
											index === suggestion.highlightedIndex &&
												'bg-accent text-accent-foreground',
										)}
									>
										<FileBadge path={item.path} className="max-w-full" />
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
