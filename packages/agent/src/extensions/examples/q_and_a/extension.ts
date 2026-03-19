import { createStore, type Store } from '../../../store/index.js';
import type { Extension, ExtensionAPI } from '../../types/index.js';
import type { Quiz } from './types.js';
import z from 'zod';
import { createQuizControl } from './control.js';

export class QAExtension implements Extension {
    readonly name = "q_and_a";
    readonly qa: Store<Quiz[]> = createStore<Quiz[]>([]);

    async setup(api: ExtensionAPI): Promise<void> {
        const qa = this.qa;
        const control = createQuizControl(qa);

        api.registerTool({
            name: "create_quiz",
            description: "Create a new multiple-choice Q&A",
            schema: z.object({
                qa: z.array(z.object({
                    question: z.string(),
                    answers: z.array(z.string()),
                    correct: z.number(),
                })),
            }),
            async execute(params: { qa: { question: string; answers: string[]; correct: number }[] }) {
                const quiz = control.createQuiz(params.qa);
                return { id: quiz.id };
            },
        });

        api.registerTool({
            name: "mark_quiz",
            description: "Returns a tuple (user_answer, correct_answer) for each question in the quiz.",
            schema: z.object({ quiz_id: z.string() }),
            async execute(params: { quiz_id: string }) {
                const quiz = qa.get().find((q) => q.id === params.quiz_id);
                if (!quiz) return { error: 'Quiz not found' };
                const answers = control.checkQuiz(quiz);
                return { answers };
            },
        });

        api.registerTool({
            name: "clear_quiz",
            description: "Remove a specific quiz from the UI.",
            schema: z.object({ quiz_id: z.string() }),
            async execute(params: { quiz_id: string }) {
                control.clearQuiz(params.quiz_id);
                return { success: true };
            },
        });

        api.on('prompt', async (ctx) => {
            const formatted = formatQuiz(qa.get());
            if (!formatted) return undefined;
            return {
                prompt: [
                    {
                        type: 'text' as const,
                        text: formatted,
                    },
                    ...ctx.prompt,
                ],
            };
        });
    }
}

function formatQuiz(quizes: readonly Quiz[]): string | undefined {
    if (quizes.length === 0) return undefined;

    const formatted = quizes.map((quiz) => {
        const questions = quiz.questions.map((q, i) => {
            const answers = q.answers.map((a, j) => {
                const correct = j === q.correct ? ' -- correct answer' : '';
                const selected = j === q.selected ? ' -- selected answer' : '';
                return `${j + 1}.${a}${selected}${correct}`;
            }).join('\n');
            return `<question ${i + 1}>${q.question}\n${answers}`;
        }).join('\n');
        return `<quiz id={${quiz.id}}>\n${questions}\n</quiz>`;
    }).join('\n');

    return `<quizes>\n${formatted}\n</quizes>`;
}
