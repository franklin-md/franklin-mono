import type { Quiz, QuizControl } from '@franklin/agent/browser';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function QuizItem({
	quiz,
	onSelect,
	onClear,
}: {
	quiz: Quiz;
	onSelect: QuizControl['selectAnswer'];
	onClear: QuizControl['clearQuiz'];
}) {
	return (
		<li className="rounded-md border p-3">
			<div className="mb-2 flex items-center justify-end">
				<Button
					variant="ghost"
					size="icon"
					className="h-5 w-5 shrink-0"
					onClick={() => onClear(quiz.id)}
				>
					<X className="h-3 w-3" />
				</Button>
			</div>

			<ol className="flex flex-col gap-3">
				{quiz.questions.map((question, qi) => (
					<li key={qi}>
						<p className="mb-1 text-xs font-medium">{question.question}</p>
						<div className="flex flex-col gap-1">
							{question.answers.map((answer, ai) => (
								<button
									key={ai}
									onClick={() => onSelect(quiz.id, qi, ai)}
									className={[
										'rounded px-2 py-1 text-left text-xs transition-colors',
										question.selected === ai
											? 'bg-primary text-primary-foreground'
											: 'bg-muted hover:bg-accent',
									].join(' ')}
								>
									{answer}
								</button>
							))}
						</div>
					</li>
				))}
			</ol>
		</li>
	);
}
