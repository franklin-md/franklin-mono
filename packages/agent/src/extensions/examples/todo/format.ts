import type { Todo } from './types.js';

/**
 * Formats a list of todos for injection into the agent's prompt.
 * Returns `undefined` when the list is empty (signals pass-through).
 */
export function formatTodos(todos: readonly Todo[]): string | undefined {
	if (todos.length === 0) return undefined;

	const lines = todos.map((t) => {
		const check = t.completed ? '[x]' : '[ ]';
		return `${check} ${t.text} (id: ${t.id})`;
	});

	return `## Current Todos\n${lines.join('\n')}`;
}
