import type { RenderedToolOutput } from '@franklin/agent';
import type { JsonValue } from '@franklin/lib';
import type { CallToolResult } from '@modelcontextprotocol/client';
import { MCPConnectionError } from './errors.js';
import { redactValue } from './redact.js';

type MCPToolOutput = {
	serverId: string;
	toolName: string;
	content: RenderedToolOutput['content'];
	structuredContent?: JsonValue;
	isError: boolean;
};

export function toolOutput(
	serverId: string,
	toolName: string,
	result: CallToolResult,
	secrets: Iterable<string>,
): MCPToolOutput {
	if (JSON.stringify(result).length > 4 * 1024 * 1024)
		throw new MCPConnectionError(
			'MCP tool result exceeds 4 MiB. Request fewer results.',
		);
	const content: RenderedToolOutput['content'] = result.content.map((part) => {
		if (part.type === 'text')
			return { type: 'text', text: redactValue(part.text, secrets) };
		if (
			part.type === 'image' &&
			['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(
				part.mimeType,
			)
		)
			return redactValue(part.data, secrets) === part.data
				? { type: 'image', data: part.data, mimeType: part.mimeType }
				: { type: 'text', text: '[Image omitted: credential data]' };
		return { type: 'text', text: `[Unsupported MCP content: ${part.type}]` };
	});
	return {
		serverId,
		toolName,
		content,
		isError: result.isError === true,
		...(result.structuredContent !== undefined
			? {
					structuredContent: redactValue(
						result.structuredContent as JsonValue,
						secrets,
					),
				}
			: {}),
	};
}

export function renderMCPOutput(value: JsonValue): RenderedToolOutput {
	const output = value as MCPToolOutput;
	const content = [...output.content];
	if (output.structuredContent !== undefined) {
		const text = JSON.stringify(output.structuredContent);
		if (!content.some((part) => part.type === 'text' && part.text === text))
			content.push({ type: 'text', text });
	}
	return { content, isError: output.isError };
}
