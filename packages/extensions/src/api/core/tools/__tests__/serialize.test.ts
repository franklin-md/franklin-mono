import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { serializeTool, toToolInputSchema } from '../serialize.js';
import type { AnyToolDefinition } from '../types.js';

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
		const tool: AnyToolDefinition = {
			name: 'greet',
			description: 'Say hello',
			schema: z.object({
				name: z.string(),
			}),
		};

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
		const tool: AnyToolDefinition = {
			name: 'greet',
			description: 'Say hello',
			schema: z.object({ name: z.string() }),
		};

		const result = serializeTool(tool);
		expect(result.inputSchema).not.toHaveProperty('$schema');
	});

	it('serializes a tool with multiple fields and optional properties', () => {
		const tool: AnyToolDefinition = {
			name: 'search',
			description: 'Search for items',
			schema: z.object({
				query: z.string(),
				limit: z.number().optional(),
			}),
		};

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
		const tool: AnyToolDefinition = {
			name: 'ping',
			description: 'Health check',
			schema: z.object({}),
		};

		const result = serializeTool(tool);

		expect(result.name).toBe('ping');
		expect(result.description).toBe('Health check');
		expect(result.inputSchema).toMatchObject({
			type: 'object',
			properties: {},
		});
	});
});
