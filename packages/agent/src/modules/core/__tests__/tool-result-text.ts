import type { TextContent, ToolResult } from '@franklin/mini-acp';

export function toolResultText(result: ToolResult | undefined): string {
	return (result?.content ?? [])
		.filter((content): content is TextContent => content.type === 'text')
		.map((content) => content.text)
		.join('\n');
}
