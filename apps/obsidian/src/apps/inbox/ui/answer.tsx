import type { ReactNode } from 'react';
import { cn } from '@franklin/ui';
import type { AnsweredQuestion } from '../types.js';

type Props = {
	answer: AnsweredQuestion;
	expanded: boolean;
	renderAnswer?: (text: string) => ReactNode;
};

export function QuestionAnswer({ answer, expanded, renderAnswer }: Props) {
	const render =
		renderAnswer ??
		((text: string) => <p className="m-0 whitespace-pre-line">{text}</p>);
	const showFullAnswer = expanded || answer.details !== undefined;
	return (
		<>
			<div
				className={cn(
					'study-answer mt-4 text-sm leading-relaxed text-muted-foreground group-[.study-question-focused]/question:text-foreground',
					showFullAnswer
						? 'study-answer-expanded'
						: 'line-clamp-3 max-h-[4.8em]',
				)}
			>
				{render(answer.answer)}
			</div>
			{!!answer.details?.length && (
				/* A bounded grid track keeps code scrolling inside the detail at narrow widths. */
				<div className="study-answer-details mt-4 grid grid-cols-1 gap-2">
					{answer.details.map((detail, index) => (
						<details
							className="study-answer-detail group/detail min-w-0 open:pb-4"
							key={index}
						>
							<summary className="cursor-pointer select-text text-sm leading-relaxed wrap-anywhere text-muted-foreground underline underline-offset-4 hover:text-foreground group-open/detail:text-foreground">
								{detail.title}
							</summary>
							<div className="study-answer study-answer-expanded mt-2 pl-4 text-sm leading-relaxed text-foreground">
								{render(detail.content)}
							</div>
						</details>
					))}
				</div>
			)}
		</>
	);
}
