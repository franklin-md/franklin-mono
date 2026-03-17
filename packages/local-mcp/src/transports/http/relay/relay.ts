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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import z from 'zod/v4';

import { parseRelayEnv } from './env.js';
import { createError, createSuccess } from '../../messages.js';

process.stderr.write(
	`[relay] starting, pid=${process.pid}, execPath=${process.execPath}\n`,
);
process.stderr.write(
	`[relay] FRANKLIN_CALLBACK_URL=${process.env['FRANKLIN_CALLBACK_URL'] ?? '(not set)'}\n`,
);
process.stderr.write(
	`[relay] FRANKLIN_TOOLS=${(process.env['FRANKLIN_TOOLS'] ?? '(not set)').slice(0, 200)}\n`,
);

const { callbackUrl, tools, name } = parseRelayEnv(process.env);
process.stderr.write(
	`[relay] parsed ${tools.length} tools: ${tools.map((t) => t.name).join(', ')}\n`,
);

const server = new McpServer({ name, version: '0.0.0' });

for (const tool of tools) {
	const toolName = tool.name;
	server.registerTool(
		toolName,
		{
			description: tool.description,
			inputSchema: z.fromJSONSchema(tool.inputSchema),
		},
		async (args) => {
			const response = await fetch(callbackUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tool: toolName, arguments: args }),
			});

			if (!response.ok) {
				const text = await response.text();
				return createError(`Error: ${text}`);
			}

			const result: unknown = await response.json();
			return createSuccess(result);
		},
	);
}

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`[relay] MCP server connected and ready\n`);
