// ---------------------------------------------------------------------------
// Content — the 4 content block types that appear inside messages
// ---------------------------------------------------------------------------

export type TextContent = {
	type: 'text';
	text: string;
};

// Essentially a text[hidden] content block
export type ThinkingContent = {
	type: 'thinking';
	text: string;
};

export type ImageContent = {
	type: 'image';
	data: string;
	mimeType: string;
};

export type ToolCallContent = {
	type: 'toolCall';
	id: string; // The tool call ID (i.e. way of associating the result with the call)
	name: string;
	arguments: Record<string, unknown>;
};

export type Content =
	| TextContent
	| ThinkingContent
	| ImageContent
	| ToolCallContent;
