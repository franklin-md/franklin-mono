import type { QuestionSource } from './types.js';

export const selectedSource: QuestionSource = {
	note: 'Sleep and wakeup',
	heading: 'Avoiding lost wakeups',
	quote:
		'When sleep returns, the process must check the condition again. Another process may have run before it reacquired the lock.',
};
