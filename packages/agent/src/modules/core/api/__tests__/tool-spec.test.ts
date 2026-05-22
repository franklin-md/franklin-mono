import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { toolSpec } from '../tool-spec.js';
import type { ToolSpec, ToolArgsOf, ToolOutputOf } from '../tool-spec.js';

describe('toolSpec', () => {
	it('creates a spec with name, description, and schema', () => {
		const spec = toolSpec('my_tool', 'My tool', z.object({ x: z.number() }));

		expect(spec.name).toBe('my_tool');
		expect(spec.description).toBe('My tool');
		expect(spec.schema).toBeDefined();
	});

	it('preserves the literal name type', () => {
		const spec = toolSpec(
			'add_todo',
			'Add a todo item',
			z.object({ text: z.string() }),
		);

		expectTypeOf(spec).toHaveProperty('name');
		expectTypeOf(spec.name).toEqualTypeOf<'add_todo'>();
	});

	it('infers args type from the zod schema', () => {
		const spec = toolSpec(
			'edit',
			'Edit a file',
			z.object({ path: z.string(), content: z.string() }),
		);

		expect(spec.name).toBe('edit');
		type Args = ToolArgsOf<typeof spec>;
		expectTypeOf<Args>().toEqualTypeOf<{
			path: string;
			content: string;
		}>();
	});

	it('is a plain object at runtime (zero cost)', () => {
		const spec = toolSpec('t', 'Test tool', z.object({}));

		expect(Object.keys(spec)).toEqual(['name', 'description', 'schema']);
	});

	it('correctly types ToolArgsOf on a generic ToolSpec', () => {
		type Spec = ToolSpec<'foo', { bar: number }>;
		type Args = ToolArgsOf<Spec>;
		expectTypeOf<Args>().toEqualTypeOf<{ bar: number }>();
	});

	it('extracts the raw output type from a generic ToolSpec', () => {
		type Output = { matches: number };
		type Spec = ToolSpec<'grep', { pattern: string }, Output>;
		type Result = ToolOutputOf<Spec>;
		expectTypeOf<Result>().toEqualTypeOf<Output>();
	});
});
