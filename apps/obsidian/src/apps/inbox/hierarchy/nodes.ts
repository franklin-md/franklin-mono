import type { StudyQuestion } from '../types.js';
import type { InboxGroup } from './types.js';

export function inboxNodes<T extends StudyQuestion>(document: {
	questions: T[];
	groups?: InboxGroup[];
}): (T | InboxGroup)[] {
	return [...document.questions, ...(document.groups ?? [])];
}
