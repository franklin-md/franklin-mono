import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { createPreviewQuestions } from './questions.js';
import { previewModels } from './models.js';
import { sampleAnswer } from './sample-answer.js';
import type { PreviewQuestion, QuestionSource } from './types.js';

export function usePreview(
	empty: boolean,
	container: RefObject<HTMLDivElement | null>,
) {
	const [questions, setQuestions] = useState<PreviewQuestion[]>(() =>
		empty ? [] : createPreviewQuestions(Date.now()),
	);
	const [model, setModel] = useState(previewModels[0].id);
	const [concurrency, setConcurrency] = useState(3);
	const timers = useRef(new Map<string, number>());

	useEffect(() => {
		const clock = container.current?.ownerDocument.defaultView;
		if (!clock) return;
		for (const [id, timer] of timers.current) {
			if (!questions.some((question) => question.id === id)) {
				clock.clearTimeout(timer);
				timers.current.delete(id);
			}
		}
		const available =
			concurrency -
			questions.filter((question) => question.state.kind === 'running').length;
		const next = questions
			.filter((question) => question.state.kind === 'queued')
			.slice(0, Math.max(0, available));
		if (next.length === 0) return;
		const ids = new Set(next.map((question) => question.id));
		setQuestions((current) =>
			current.map((question) =>
				ids.has(question.id)
					? { ...question, state: { kind: 'running' } }
					: question,
			),
		);
		for (const [index, question] of next.entries()) {
			const timer = clock.setTimeout(
				() => {
					timers.current.delete(question.id);
					setQuestions((current) =>
						current.map((item) =>
							item.id === question.id
								? {
										...item,
										state: {
											kind: 'answered',
											answer: sampleAnswer(item.text),
										},
									}
								: item,
						),
					);
				},
				3200 + index * 650,
			);
			timers.current.set(question.id, timer);
		}
	}, [questions, concurrency, container]);

	useEffect(() => {
		const clock = container.current?.ownerDocument.defaultView;
		const pending = timers.current;
		return () => {
			for (const timer of pending.values()) clock?.clearTimeout(timer);
			pending.clear();
		};
	}, [container]);

	function add(text: string, parentId?: string, source?: QuestionSource) {
		if (!text.trim()) return;
		const question: PreviewQuestion = {
			id: crypto.randomUUID(),
			text: text.trim(),
			createdAt: Date.now(),
			model,
			answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
			parentId,
			source,
			state: { kind: 'queued' },
		};
		setQuestions((current) => [question, ...current]);
	}

	function remove(id: string) {
		setQuestions((current) => {
			const deleted = new Set([id]);
			// Follow-ups may be inserted before their parent in the newest-first list.
			// Traverse to a fixed point so deleting a branch removes every descendant.
			let count: number;
			do {
				count = deleted.size;
				for (const question of current) {
					if (question.parentId && deleted.has(question.parentId))
						deleted.add(question.id);
				}
			} while (deleted.size !== count);
			return current.filter((question) => !deleted.has(question.id));
		});
	}

	function retry(id: string) {
		setQuestions((current) =>
			current.map((question) =>
				question.id === id && question.state.kind === 'failed'
					? {
							...question,
							state: { kind: 'queued' },
						}
					: question,
			),
		);
	}

	return {
		questions,
		model,
		setModel,
		concurrency,
		setConcurrency,
		add,
		remove,
		retry,
	};
}
