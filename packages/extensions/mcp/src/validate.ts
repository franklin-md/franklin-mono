import { Ajv } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { JsonObject } from '@franklin/lib';
import { MCPConnectionError } from './errors.js';

export function compileSchema(schema: JsonObject): (value: unknown) => void {
	if (JSON.stringify(schema).length > 64_000 || schema.type !== 'object')
		throw new MCPConnectionError('Unsupported or oversized MCP object schema.');
	let nodes = 0;
	function visit(value: unknown, depth: number): void {
		if (++nodes > 4000 || depth > 30)
			throw new MCPConnectionError('MCP schema is too complex.');
		if (!value || typeof value !== 'object') return;
		for (const [key, child] of Object.entries(value)) {
			if (
				(key === '$ref' || key === '$dynamicRef') &&
				(typeof child !== 'string' || !child.startsWith('#'))
			)
				throw new MCPConnectionError(
					'External MCP schema references are unsupported.',
				);
			visit(child, depth + 1);
		}
	}
	visit(schema, 0);
	const dialect = schema.$schema;
	if (
		dialect !== undefined &&
		dialect !== 'http://json-schema.org/draft-07/schema#' &&
		dialect !== 'https://json-schema.org/draft/2020-12/schema'
	)
		throw new MCPConnectionError('Unsupported MCP JSON Schema dialect.');
	const options = {
		strict: false,
		allErrors: false,
		validateFormats: false,
		ownProperties: true,
	};
	const ajv =
		dialect === 'http://json-schema.org/draft-07/schema#'
			? new Ajv(options)
			: new Ajv2020(options);
	try {
		const validate = ajv.compile(schema);
		return (value) => {
			if (!validate(value))
				throw new MCPConnectionError(
					'MCP data does not match the tool schema.',
				);
		};
	} catch {
		throw new MCPConnectionError('Invalid MCP tool schema.');
	}
}
