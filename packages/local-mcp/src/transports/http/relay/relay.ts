#!/usr/bin/env node

/**
 * MCP Relay: Stdio MCP server that bridges tool calls to an HTTP callback URL.
 *
 * Reads environment variables (see relay-env.ts):
 * - FRANKLIN_CALLBACK_URL — HTTP endpoint to POST tool calls to
 * - FRANKLIN_TOOLS — JSON-serialized array of { name, description, inputSchema }
 *
 * Creates a stdio MCP server, registers tools from FRANKLIN_TOOLS, and when
 * a tool is called, POSTs { tool, arguments } to FRANKLIN_CALLBACK_URL.
 */

/* eslint-disable @typescript-eslint/no-deprecated -- Server is needed for raw JSON Schema tools; McpServer requires Zod */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { RELAY_NAME } from './tags.js';
import { parseRelayEnv } from './env.js';
import { createError, createSuccess } from '../../messages.js';

const { callbackUrl, tools } = parseRelayEnv(process.env);

const server = new Server(
	{ name: RELAY_NAME, version: '0.0.0' },
	{ capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: tools.map((t) => ({
		name: t.name,
		description: t.description,
		inputSchema: t.inputSchema as {
			type: 'object';
			properties?: Record<string, unknown>;
		},
	})),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	const tool = tools.find((t) => t.name === name);
	if (!tool) {
		return createError(`Unknown tool: ${name}`);
	}

	const response = await fetch(callbackUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ tool: name, arguments: args }),
	});

	if (!response.ok) {
		const text = await response.text();
		return createError(`Error: ${text}`);
	}

	const result: unknown = await response.json();
	return createSuccess(result);
});

const transport = new StdioServerTransport();
await server.connect(transport);
