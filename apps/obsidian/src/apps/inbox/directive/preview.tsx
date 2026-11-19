import type { ReactElement } from 'react';
import { Inbox, Trash2 } from 'lucide-react';
import { IconButton } from '@franklin/ui';
import type { AnsweredQuestion } from '../types.js';
import { QuestionAnswer } from '../ui/answer.js';
import { HoverPopover } from '../../../shared/ui/hover-popover.js';

type Props = {
	answer: AnsweredQuestion;
	title: string;
	onOpen: () => void;
	onDelete: () => void;
	children: ReactElement;
};

export function AnswerPreview({
	answer,
	title,
	onOpen,
	onDelete,
	children,
}: Props) {
	return (
		<HoverPopover
			trigger={children}
			label="Answer preview"
			className="flex max-h-[min(36rem,var(--radix-popover-content-available-height))] w-96 flex-col overflow-hidden text-sm"
		>
			{(close) => (
				<>
					<header className="flex shrink-0 items-start gap-3 bg-muted/40 px-4 py-3">
						<h3 className="m-0 max-h-24 min-w-0 flex-1 overflow-y-auto text-sm leading-snug font-semibold wrap-anywhere">
							{title}
						</h3>
						<div className="flex shrink-0 gap-1">
							<IconButton
								icon={Inbox}
								type="button"
								aria-label="Open question in Inbox"
								title="Open in Inbox to ask a follow-up"
								onClick={() => {
									close();
									onOpen();
								}}
							/>
							<IconButton
								icon={Trash2}
								type="button"
								aria-label="Delete question"
								title="Delete question and its follow-ups"
								className="hover:text-destructive"
								onClick={onDelete}
							/>
						</div>
					</header>
					<div className="min-h-0 overflow-auto overscroll-contain p-4 [&>.study-answer]:mt-0 [&>.study-answer]:text-inherit">
						<QuestionAnswer answer={answer} expanded />
					</div>
				</>
			)}
		</HoverPopover>
	);
}
