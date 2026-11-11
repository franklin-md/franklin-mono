import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactElement } from 'react';
import { Inbox, Trash2 } from 'lucide-react';
import {
	IconButton,
	Markdown,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@franklin/ui';
import type { AnsweredQuestion } from '../types.js';
import { QuestionAnswer } from '../ui/answer.js';

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
	const [open, setOpen] = useState(false);
	const trigger = useRef<HTMLButtonElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const hovered = useRef(false);
	const cancelPending = useRef(() => {});
	useEffect(() => () => cancelPending.current(), []);

	function cancelTimer() {
		cancelPending.current();
	}

	function schedule(action: () => void, delay: number) {
		cancelTimer();
		const win = trigger.current?.ownerDocument.defaultView;
		if (!win) return;
		const id = win.setTimeout(action, delay);
		cancelPending.current = () => win.clearTimeout(id);
	}

	function closeAfterLeaving() {
		// Allow crossing the gap between the pill and its portaled content.
		schedule(() => {
			const active = trigger.current?.ownerDocument.activeElement;
			const focused =
				active &&
				(trigger.current.contains(active) || content.current?.contains(active));
			if (!hovered.current && !focused) setOpen(false);
		}, 180);
	}

	const interactions = {
		onPointerEnter(event: PointerEvent<HTMLElement>) {
			if (event.pointerType === 'touch') return;
			hovered.current = true;
			cancelTimer();
			if (!open) schedule(() => setOpen(true), 300);
		},
		onPointerLeave() {
			hovered.current = false;
			closeAfterLeaving();
		},
		onFocus() {
			cancelTimer();
			setOpen(true);
		},
		onBlur: closeAfterLeaving,
	};

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				cancelTimer();
				setOpen(next);
			}}
		>
			<PopoverTrigger
				asChild
				ref={trigger}
				{...interactions}
				onKeyDown={(event) => {
					if (
						event.key !== 'Tab' ||
						event.shiftKey ||
						!open ||
						!content.current
					)
						return;
					// The portal is outside the note's DOM tab order; enter its first control.
					event.preventDefault();
					const first = content.current.querySelector<HTMLElement>(
						'a[href], button:not([disabled]), summary',
					);
					(first ?? content.current).focus();
				}}
				onClick={(event) => {
					// Keep the pill's Inbox navigation instead of Radix's click toggle.
					event.preventDefault();
					cancelTimer();
					setOpen(false);
				}}
			>
				{children}
			</PopoverTrigger>
			<PopoverContent
				ref={content}
				{...interactions}
				aria-label="Answer preview"
				side="top"
				align="center"
				sideOffset={6}
				collisionPadding={8}
				className="box-border flex max-h-[min(36rem,var(--radix-popover-content-available-height))] w-96 max-w-[calc(100vw-1rem)] flex-col overflow-hidden font-sans text-sm select-text motion-reduce:animate-none"
				// Hover must not steal editor focus, including when the preview closes.
				// https://www.radix-ui.com/primitives/docs/components/popover#content
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
				onEscapeKeyDown={() => {
					const active = content.current?.ownerDocument.activeElement;
					if (active && content.current.contains(active))
						trigger.current?.focus();
				}}
			>
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
								cancelTimer();
								setOpen(false);
								onOpen();
							}}
						/>
						<IconButton
							icon={Trash2}
							type="button"
							aria-label="Delete question"
							title="Delete question and its follow-ups"
							className="hover:text-[var(--text-error)]"
							onClick={onDelete}
						/>
					</div>
				</header>
				<div className="min-h-0 overflow-auto overscroll-contain p-4 [&>.study-answer]:mt-0 [&>.study-answer]:text-inherit">
					<QuestionAnswer
						answer={answer}
						expanded
						renderAnswer={renderAnswer}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function renderAnswer(text: string) {
	return (
		<Markdown
			text={text}
			className="prose-content text-inherit leading-[inherit]"
		/>
	);
}
