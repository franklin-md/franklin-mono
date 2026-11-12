import { ArrowUpRight, FileText } from 'lucide-react';
import { questionTitle } from '../../title.js';
import type { StudyQuestion, QuestionSource } from '../../types.js';
import { hasTextSelection } from './has-text-selection.js';

type Props = {
	question: StudyQuestion;
	source?: QuestionSource;
	onOpenSource?: (source: QuestionSource) => void;
};

export function QuestionInfo({ question, source, onOpenSource }: Props) {
	const title = questionTitle(question);
	const sourceHref =
		source?.location && onOpenSource
			? `obsidian://open?file=${encodeURIComponent(source.location.path)}`
			: undefined;
	if (!source && title === question.text) return null;
	return (
		<div className="space-y-2">
			{title !== question.text && (
				<details className="study-original text-sm text-muted-foreground">
					<summary className="w-fit cursor-pointer select-text">
						Original question
					</summary>
					<p className="mt-1.5 mb-0 text-base whitespace-pre-wrap leading-relaxed wrap-anywhere">
						{question.text}
					</p>
				</details>
			)}

			{source && (
				<a
					className="flex min-w-0 max-w-full select-text items-center gap-1.5 text-left text-xs text-muted-foreground no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&[href]]:hover:text-primary"
					href={sourceHref}
					draggable={false}
					aria-label={
						sourceHref ? `Open source note: ${source.note}` : undefined
					}
					title={
						sourceHref ? 'Open source note at the original passage' : undefined
					}
					onClick={(event) => {
						if (!sourceHref) return;
						event.preventDefault();
						if (!hasTextSelection(event.currentTarget, event.detail))
							onOpenSource?.(source);
					}}
				>
					<FileText size={12} />
					<span className="min-w-0 truncate">{source.note}</span>
					{source.heading && (
						<span className="min-w-0 flex-1 truncate opacity-70">
							/ {source.heading}
						</span>
					)}
					{sourceHref && (
						<ArrowUpRight
							className="ml-auto opacity-70"
							size={12}
							aria-hidden="true"
						/>
					)}
				</a>
			)}
		</div>
	);
}
