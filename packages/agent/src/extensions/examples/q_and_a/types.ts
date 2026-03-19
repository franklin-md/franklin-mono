export interface Quiz {
    id: string,
    questions: Question[],
    completed: boolean,
    correct: number,
}

export interface QuizControl {
    createQuiz: (qa: {question: string, answers: string[], correct: number}[]) => Quiz;
    checkQuiz: (quiz: Quiz) => [number | null, number][];
    clearQuiz: (id: string) => void;
    selectAnswer: (quizId: string, questionIndex: number, answerIndex: number) => void;
    quizzes: () => readonly Quiz[];
}

export interface Question {
    question: string,
    answers: string[],

    selected: number | null,
    correct: number,
}

