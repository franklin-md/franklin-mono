import { useId } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { IconButton } from '@franklin/ui';
import type { ReactNode } from 'react';
import type { InboxGroup } from '../hierarchy/types.js';
import { hasTextSelection } from './card/has-text-selection.js';

type Props = {
	group: InboxGroup;
	title: string;
	count: number;
	children: ReactNode;
	onFold?: (id: string, folded: boolean) => void;
	onDelete: (id: string) => void;
};

export function QuestionGroup({
	group,
	title,
	count,
	children,
	onFold,
	onDelete,
}: Props) {
	const bodyId = useId();
	return (
		<details
			className="study-group min-w-0 rounded-xl bg-muted/40 ring-1 ring-inset ring-border [&[open]>summary>svg]:rotate-90"
			open={!group.folded}
			onToggle={(event) => {
				if (event.target !== event.currentTarget) return;
				const folded = !event.currentTarget.open;
				if (folded !== group.folded) onFold?.(group.id, folded);
			}}
		>
			<summary
				className="group/group-header flex min-w-0 cursor-pointer list-none select-text items-start gap-2 rounded-xl px-4 py-3 text-sm leading-normal font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
				aria-controls={bodyId}
				title={title}
				onClick={(event) => {
					if (hasTextSelection(event.currentTarget, event.detail))
						event.preventDefault();
				}}
			>
				<ChevronRight
					size={14}
					aria-hidden="true"
					className="mt-0.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none"
				/>
				<span className="min-w-0 flex-1 line-clamp-2 wrap-anywhere">
					{title}
				</span>
				<span
					className="mt-0.5 shrink-0 text-xs font-normal text-muted-foreground"
					aria-label={`${count} ${count === 1 ? 'question' : 'questions'}`}
				>
					{count}
				</span>
				<IconButton
					icon={Trash2}
					type="button"
					className="-my-0.5 size-6 shrink-0 text-muted-foreground opacity-0 group-hover/group-header:opacity-100 group-focus-within/group-header:opacity-100 hover:text-[var(--text-error)] [@media(hover:none)]:opacity-100"
					aria-label={`Delete group: ${title}`}
					title="Delete group and all its questions"
					onClick={(event) => {
						// A delete click must not activate the summary's native fold behavior.
						event.preventDefault();
						event.stopPropagation();
						onDelete(group.id);
					}}
				/>
			</summary>
			{/* Native disclosure keeps question components mounted, including their drafts. */}
			<div id={bodyId} className="flex min-w-0 flex-col gap-3">
				{children}
			</div>
		</details>
	);
}
