// Conversation
export { conversationExtension } from './conversation/index.js';
export type {
	AssistantBlock,
	AssistantTurn,
	ConversationTurn,
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
	TurnEndBlock,
} from './conversation/index.js';

// Conversation title
export { conversationTitleExtension } from './conversation-title/index.js';
export type {
	ConversationTitle,
	ConversationTitleControl,
} from './conversation-title/index.js';

// Todo
export { createTodoControl, todoExtension } from './todo/index.js';
export type { Todo, TodoControl } from './todo/index.js';

// Status
export { createStatusControl, statusExtension } from './status/index.js';
export type { StatusControl, StatusState } from './status/index.js';

// Filesystem
export {
	createFilesystemExtension,
	filesystemExtension,
} from './filesystem/index.js';

// PDF
export {
	createReadPDFExtension,
	FreePDFConverter,
	MistralPDFConverter,
	type PDFConverter,
	type PDFInput,
} from './pdf/index.js';

// Terminal
export { bashExtension } from './terminal/index.js';

// Web
export {
	DEFAULT_WEB_FETCH_OPTIONS,
	DEFAULT_WEB_SEARCH_OPTIONS,
	createWebExtension,
} from './web/index.js';
export type {
	WebExtensionOptions,
	WebFetchExtensionOptions,
	WebFetchProcessedResult,
	WebSearchExtensionOptions,
	WebSearchResult,
} from './web/index.js';

// Spawn
export { spawnExtension } from './spawn/index.js';

// Instructions
export { instructionsExtension } from './instructions/index.js';
export type {
	InstructionSpec,
	InstructionsManager,
} from './instructions/index.js';

// Environment info
export { environmentInfoExtension } from './environment-info/index.js';
