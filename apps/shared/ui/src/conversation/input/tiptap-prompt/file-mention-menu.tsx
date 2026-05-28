import { createPortal } from 'react-dom';

import type { FileReferenceItem } from '@franklin/react';

import { FileBadge } from '../../../components/file-icon/badge.js';
import { cn } from '../../../lib/cn.js';
import { usePortalContainer } from '../../../lib/portal-container.js';

import type { FileMentionSuggestionState } from './file-mention-menu-controller.js';

const MENU_WIDTH = 320;
const MENU_GUTTER = 8;
const MENU_OFFSET = 6;

interface FileMentionMenuProps {
	readonly suggestion: FileMentionSuggestionState;
	readonly items: readonly FileReferenceItem[];
	readonly onHighlight: (index: number) => void;
}

function getFallbackContainer(): HTMLElement | undefined {
	return typeof document === 'undefined' ? undefined : document.body;
}

function getViewportWidth(): number {
	if (typeof document !== 'undefined') {
		return document.documentElement.clientWidth;
	}
	return MENU_WIDTH + MENU_GUTTER * 2;
}

export function getFileMentionMenuStyle(
	rect: DOMRect,
	viewportWidth = getViewportWidth(),
): React.CSSProperties {
	const width = Math.min(MENU_WIDTH, viewportWidth - MENU_GUTTER * 2);
	const maxLeft = Math.max(MENU_GUTTER, viewportWidth - width - MENU_GUTTER);
	const left = Math.min(Math.max(rect.left, MENU_GUTTER), maxLeft);

	return {
		position: 'fixed',
		top: rect.bottom + MENU_OFFSET,
		left,
		width,
	};
}

export function FileMentionMenu({
	suggestion,
	items,
	onHighlight,
}: FileMentionMenuProps) {
	const portalContainer = usePortalContainer() ?? getFallbackContainer();

	if (!suggestion.active || !portalContainer) {
		return null;
	}

	const rect = suggestion.clientRect?.();
	if (!rect) {
		return null;
	}

	return createPortal(
		<div
			className="z-50 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-inset ring-ring/70"
			style={getFileMentionMenuStyle(rect)}
			role="listbox"
			aria-label="File mentions"
			onMouseDown={(event) => {
				event.preventDefault();
			}}
		>
			{items.length === 0 ? (
				<div className="px-3 py-2 text-sm text-muted-foreground">
					No files found
				</div>
			) : (
				<div className="max-h-72 overflow-y-auto p-1">
					{items.map((item, index) => (
						<button
							key={item.path}
							type="button"
							role="option"
							aria-selected={index === suggestion.highlightedIndex}
							className={cn(
								'flex w-full min-w-0 items-center rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors',
								index === suggestion.highlightedIndex
									? 'bg-accent text-accent-foreground'
									: 'text-popover-foreground hover:bg-accent/70 hover:text-accent-foreground',
							)}
							onMouseEnter={() => onHighlight(index)}
							onClick={() => suggestion.command(item)}
						>
							<FileBadge path={item.path} className="max-w-full" />
						</button>
					))}
				</div>
			)}
		</div>,
		portalContainer,
	);
}
