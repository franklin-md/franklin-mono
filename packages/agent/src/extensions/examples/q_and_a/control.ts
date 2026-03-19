import type { Store } from '@franklin/agent/browser';
import type { Quiz, QuizControl } from "./types.js";

export function createQuizControl(qa_store: Store<Quiz[]>): QuizControl {
    return {
        createQuiz: (qa: { question: string, answers: string[], correct: number}[]) => {
            const questions = qa.map((question) => ({
                question: question.question,
                answers: question.answers,
                selected: null,
                correct: question.correct,
            }));

            const quiz = {
                id: crypto.randomUUID(),
                questions: questions,
                completed: false,
                correct: 0,
            };

            qa_store.set((draft: any) => {draft.push(quiz)});
            return quiz;
        },
        checkQuiz: (quiz: Quiz) => {
            const pairs: [number | null, number][] = [];
            for (const question of quiz.questions) {
                pairs.push([question.selected, question.correct]);
            }
            return pairs;
        },
        clearQuiz: (id: string) => {
            qa_store.set((draft) => {
                const idx = draft.findIndex((q) => q.id === id);
                if (idx !== -1) draft.splice(idx, 1);
            });
        },
        selectAnswer: (quizId: string, questionIndex: number, answerIndex: number) => {
            qa_store.set((draft) => {
                const quiz = draft.find((q) => q.id === quizId);
                if (quiz && quiz.questions[questionIndex]) {
                    quiz.questions[questionIndex].selected = answerIndex;
                }
            });
        },
        quizzes: () => qa_store.get(),
    };
}