import type { QAExtension } from '@franklin/agent/browser';
import { createQuizControl } from '@franklin/agent/browser';
import { useStore } from '@franklin/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { QuizItem } from './quiz-item.js';

export function QuizPanel({ qaExt }: { qaExt: QAExtension }) {
	const reactStore = useStore(qaExt.qa);
	const control = createQuizControl(reactStore);

	return (
		<Card className="flex w-80 flex-col overflow-hidden rounded-none border-y-0 border-r-0 shadow-none">
			<CardHeader className="px-4 py-3">
				<CardTitle className="text-sm">Quizzes</CardTitle>
			</CardHeader>

			<CardContent className="flex-1 overflow-hidden p-0">
				<ScrollArea className="h-full px-4 pb-4">
					{control.quizzes().length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							No quizzes yet.
						</p>
					) : (
						<ul className="flex flex-col gap-3">
							{control.quizzes().map((quiz) => (
								<QuizItem
									key={quiz.id}
									quiz={quiz}
									onSelect={control.selectAnswer}
									onClear={control.clearQuiz}
								/>
							))}
						</ul>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
