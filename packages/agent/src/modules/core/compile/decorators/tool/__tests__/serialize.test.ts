import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { RegisteredTool } from '../../../registrations/tools.js';
import { serializeTool, toToolInputSchema } from '../serialize.js';

function registeredTool(
	name: string,
	description: string,
	schema: z.ZodType,
): RegisteredTool {
	return {
		name,
		description,
		schema,
		run: () => ({
			output: '',
			rendered: { content: [{ type: 'text', text: '' }] },
		}),
	};
}

describe('toToolInputSchema', () => {
	it('strips the $schema field from the output', () => {
		const schema = z.object({ name: z.string() });
		const result = toToolInputSchema(schema);
		expect(result).not.toHaveProperty('$schema');
	});

	it('preserves the structural schema properties', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number().optional(),
		});
		const result = toToolInputSchema(schema);
		expect(result).toMatchObject({
			type: 'object',
			properties: {
				name: { type: 'string' },
				age: { type: 'number' },
			},
			required: ['name'],
		});
	});
});

describe('serializeTool', () => {
	it('serializes a tool with a simple schema', () => {
		const tool = registeredTool(
			'greet',
			'Say hello',
			z.object({
				name: z.string(),
			}),
		);

		const result = serializeTool(tool);

		expect(result.name).toBe('greet');
		expect(result.description).toBe('Say hello');
		expect(result.inputSchema).toMatchObject({
			type: 'object',
			properties: {
				name: { type: 'string' },
			},
			required: ['name'],
		});
	});

	it('does not include $schema in the inputSchema', () => {
		const tool = registeredTool(
			'greet',
			'Say hello',
			z.object({ name: z.string() }),
		);

		const result = serializeTool(tool);
		expect(result.inputSchema).not.toHaveProperty('$schema');
	});

	it('serializes a tool with multiple fields and optional properties', () => {
		const tool = registeredTool(
			'search',
			'Search for items',
			z.object({
				query: z.string(),
				limit: z.number().optional(),
			}),
		);

		const result = serializeTool(tool);

		expect(result.name).toBe('search');
		expect(result.description).toBe('Search for items');
		expect(result.inputSchema).toMatchObject({
			type: 'object',
			properties: {
				query: { type: 'string' },
				limit: { type: 'number' },
			},
			required: ['query'],
		});
	});

	it('serializes a tool with an empty object schema', () => {
		const tool = registeredTool('ping', 'Health check', z.object({}));

		const result = serializeTool(tool);

		expect(result.name).toBe('ping');
		expect(result.description).toBe('Health check');
		expect(result.inputSchema).toMatchObject({
			type: 'object',
			properties: {},
		});
	});
});
