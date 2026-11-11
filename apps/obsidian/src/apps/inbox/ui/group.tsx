import { useId } from 'react';
import type { ReactNode } from 'react';
import type { InboxGroup } from '../hierarchy/types.js';
import { hasTextSelection } from './card/has-text-selection.js';

type Props = {
	group: InboxGroup;
	children: ReactNode;
	onFold?: (id: string, folded: boolean) => void;
};

export function QuestionGroup({ group, children, onFold }: Props) {
	const bodyId = useId();
	return (
		<details
			className="min-w-0"
			open={!group.folded}
			onToggle={(event) => {
				if (event.target !== event.currentTarget) return;
				const folded = !event.currentTarget.open;
				if (folded !== group.folded) onFold?.(group.id, folded);
			}}
		>
			<summary
				className="cursor-pointer select-text text-sm font-medium wrap-anywhere text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
				aria-controls={bodyId}
				onClick={(event) => {
					if (hasTextSelection(event.currentTarget)) event.preventDefault();
				}}
			>
				<span>{group.title ?? 'Group'}</span>
			</summary>
			{/* Native disclosure keeps question components mounted, including their drafts. */}
			<div id={bodyId} className="mt-3 flex min-w-0 flex-col gap-3">
				{group.context && (
					<details className="text-xs text-muted-foreground">
						<summary className="cursor-pointer select-text">
							Group context
						</summary>
						<p className="mb-0 whitespace-pre-wrap wrap-anywhere">
							{group.context}
						</p>
					</details>
				)}
				{children}
			</div>
		</details>
	);
}
