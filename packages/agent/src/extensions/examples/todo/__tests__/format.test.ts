import { describe, expect, it } from 'vitest';

import { formatTodos } from '../format.js';
import type { Todo } from '../types.js';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
	return {
		id: 'test-id',
		text: 'Test todo',
		completed: false,
		createdAt: 1000,
		...overrides,
	};
}

describe('formatTodos', () => {
	it('returns undefined for empty list', () => {
		expect(formatTodos([])).toBeUndefined();
	});

	it('formats a single incomplete todo with [ ]', () => {
		const result = formatTodos([makeTodo()]);
		expect(result).toContain('[ ]');
		expect(result).toContain('Test todo');
		expect(result).toContain('test-id');
	});

	it('formats a single completed todo with [x]', () => {
		const result = formatTodos([makeTodo({ completed: true })]);
		expect(result).toContain('[x]');
		expect(result).toContain('Test todo');
	});

	it('formats multiple todos with correct markers and IDs', () => {
		const todos = [
			makeTodo({ id: 'a', text: 'First', completed: false }),
			makeTodo({ id: 'b', text: 'Second', completed: true }),
			makeTodo({ id: 'c', text: 'Third', completed: false }),
		];
		const result = formatTodos(todos)!;

		expect(result).toContain('<todos>');
		expect(result).toContain('</todos>');
		expect(result).toContain('[ ] First (id: a)');
		expect(result).toContain('[x] Second (id: b)');
		expect(result).toContain('[ ] Third (id: c)');
	});
});
