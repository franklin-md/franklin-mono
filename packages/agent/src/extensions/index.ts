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
export { filesystemBundle, filesystemExtension } from './filesystem/index.js';

// PDF
export {
	createReadPDFExtension,
	readPDFSpec,
	type ReadPDFExtensionOptions,
} from './pdf/index.js';

// Terminal
export { bashExtension } from './terminal/index.js';

// Web
export {
	DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID,
	EXA_WEB_SEARCH_PROVIDER_ID,
	createDuckDuckGoWebSearchProvider,
	createExaWebSearchProvider,
	createWebExtension,
	webFetchExtension,
	webSearchExtension,
	webSearchProviders,
	webSearchToolExtension,
} from './web/index.js';
export type {
	WebExtensionOptions,
	WebFetchExtensionOptions,
	WebSearchOutput,
	WebSearchProvider,
	WebSearchProviderRequest,
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
