import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import type { PreviewQuestion } from './types.js';
import { previewModels } from './models.js';
import { selectedSource } from './source.js';

export function createPreviewQuestions(now: number): PreviewQuestion[] {
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const base = {
		model: previewModels[0].id,
		modelLabel: previewModels[0].label,
		answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
	};
	return [
		{
			...base,
			id: 'lock',
			text: 'Why check the condition again after waking up?',
			createdAt: now - 5 * 60_000,
			source: selectedSource,
			state: {
				kind: 'answered',
				answer:
					'Waking makes a process runnable; it does not reserve the resource. Another process can consume it before the sleeper reacquires the lock. Recheck the condition while holding that lock.',
			},
		},
		{
			...base,
			id: 'csr',
			text: 'What does CSR stand for?',
			createdAt: now - 22 * 60_000,
			source: {
				note: 'RISC-V traps',
				heading: 'Registers',
				quote:
					'The kernel reads scause, a CSR, to determine the cause of a trap.',
			},
			state: {
				kind: 'answered',
				answer:
					'Control and Status Register. A RISC-V register used to configure or inspect processor state; scause records a trap’s cause.',
			},
		},
		{
			...base,
			id: 'failed',
			text: 'Where is the trapframe saved?',
			createdAt: now - 40 * 60_000,
			state: {
				kind: 'failed',
				error: 'Connection interrupted. Your question is saved.',
			},
		},
		{
			...base,
			id: 'borrow',
			text: 'Does a shared reference copy the value?',
			createdAt: yesterday.getTime(),
			source: {
				note: 'Rust ownership',
				heading: 'Borrowing',
				quote:
					'A shared reference lets you access a value without taking ownership.',
			},
			state: {
				kind: 'answered',
				answer:
					'No. It refers to the existing value. Copying a shared reference copies the reference, not its referent.',
			},
		},
		{
			...base,
			id: 'borrow-child',
			parentId: 'borrow',
			text: 'Even if that value implements Copy?',
			createdAt: yesterday.getTime() + 60_000,
			state: {
				kind: 'answered',
				answer:
					'Yes. Borrowing still creates a reference. Copy applies when you copy the value itself, for example by dereferencing it in a value context.',
			},
		},
	];
}
