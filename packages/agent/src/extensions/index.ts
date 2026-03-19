export { compileExtension } from './compile/index.js';
export type { McpTransportFactory } from './compile/index.js';
export type {
	Extension,
	ExtensionAPI,
	ExtensionToolDefinition,
	PromptHandler,
	SessionStartHandler,
	SessionUpdateHandler,
} from './types/index.js';
export { TodoExtension } from './examples/todo/index.js';
export { createTodoControl } from './examples/todo/index.js';
export type { Todo } from './examples/todo/index.js';
export { ConversationExtension } from './examples/conversation/index.js';
export { QAExtension, createQuizControl } from './examples/q_and_a/index.js';
export type { Quiz, Question, QuizControl } from './examples/q_and_a/index.js';
export type {
	AgentTextEntry,
	AgentThoughtEntry,
	ConversationEntry,
	ConversationTurn,
	ToolCallEntry,
	UserEntry,
} from './examples/conversation/index.js';
