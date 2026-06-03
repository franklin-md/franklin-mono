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

// Viewing context
export { viewingContextExtension } from './viewing-context/index.js';
export type {
	ViewedReference,
	ViewingContextState,
} from './viewing-context/index.js';

// Filesystem
export { filesystemBundle, filesystemExtension } from './filesystem/index.js';

// References
export {
	filesystemFileReferenceExtension,
	referenceHandlerExtension,
	imageDocumentReferenceExtension,
	referenceReadExtension,
	referenceReadFileSpec,
	textDocumentReferenceExtension,
} from './references/index.js';
export type {
	TextLineRange,
	TextReferenceSelector,
} from './references/index.js';

// Mention
export {
	MENTION_TRIGGER,
	formatReferenceMention,
	mentionExtension,
	parseReferenceMention,
	splitMentionSegments,
} from './mention/index.js';
export type { MentionSegment } from './mention/index.js';

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
