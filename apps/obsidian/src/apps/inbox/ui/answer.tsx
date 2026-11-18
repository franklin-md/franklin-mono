import { Markdown, cn } from '@franklin/ui';
import type { AnsweredQuestion } from '../types.js';

type Props = {
	answer: AnsweredQuestion;
	expanded: boolean;
};

const sanitize = { protocols: { href: ['obsidian'] } };

function renderMarkdown(text: string) {
	return (
		<Markdown
			text={text}
			sanitize={sanitize}
			className="prose-content text-inherit leading-[inherit]"
		/>
	);
}

export function QuestionAnswer({ answer, expanded }: Props) {
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
				{renderMarkdown(answer.answer)}
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
								{renderMarkdown(detail.content)}
							</div>
						</details>
					))}
				</div>
			)}
		</>
	);
}
