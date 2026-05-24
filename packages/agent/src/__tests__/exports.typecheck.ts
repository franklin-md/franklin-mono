import { z } from 'zod';

import type {
	ConversationTitle,
	StatusState,
	StoreKey,
	StoreValueType,
	Todo,
	WebExtensionOptions,
	WebFetchExtensionOptions,
	WebSearchExtensionOptions,
	WebSearchOutput,
	WebSearchProvider,
	WebSearchProviderRequest,
	WebSearchResult,
} from '../index.js';
import {
	DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID,
	EXA_WEB_SEARCH_PROVIDER_ID,
	conversationTitleExtension,
	createDuckDuckGoWebSearchProvider,
	createExaWebSearchProvider,
	createStore,
	createWebExtension,
	defineExtension,
	statusExtension,
	storeKey,
	todoExtension,
	toolSpec,
	webFetchExtension,
	webSearchExtension,
	webSearchProviders,
	webSearchToolExtension,
} from '../index.js';
// @ts-expect-error private core runtime state symbol must stay out of root.
import { CORE_STATE as _RootCoreState } from '../index.js';
// @ts-expect-error private environment runtime state symbol must stay out of root.
import { ENV_STATE as _RootEnvironmentState } from '../index.js';
// @ts-expect-error private store runtime mapping symbol must stay out of root.
import { STORE_MAPPING as _RootStoreMapping } from '../index.js';
// @ts-expect-error runtime constructors are internal compiler implementation details.
import { createEnvironmentRuntime as _RootCreateEnvironmentRuntime } from '../index.js';
// @ts-expect-error runtime constructors are internal compiler implementation details.
import { createStoreRuntime as _RootCreateStoreRuntime } from '../index.js';
// @ts-expect-error runtime state-handle projections are internal module plumbing.
import { storeStateHandle as _RootStoreStateHandle } from '../index.js';
// @ts-expect-error core state-handle projections are internal module plumbing.
import { coreStateHandle as _RootCoreStateHandle } from '../index.js';
// @ts-expect-error core compiler constructors are internal module plumbing.
import { createCoreCompiler as _RootCreateCoreCompiler } from '../index.js';
// @ts-expect-error core tool serialization is internal compiler plumbing.
import { serializeTool as _RootSerializeTool } from '../index.js';
// @ts-expect-error core tool schema serialization is internal compiler plumbing.
import { toToolInputSchema as _RootToToolInputSchema } from '../index.js';
// @ts-expect-error core registrar tuple types are internal compiler plumbing.
import type { CoreOnRegistration as _RootCoreOnRegistration } from '../index.js';
// @ts-expect-error core registrar tuple types are internal compiler plumbing.
import type { CoreRegisterToolRegistration as _RootCoreRegisterToolRegistration } from '../index.js';
// @ts-expect-error inline tool definitions are not part of the public tool API.
import type { ExtensionToolDefinition as _RootExtensionToolDefinition } from '../index.js';
// @ts-expect-error tool implementation adapter types are internal compiler plumbing.
import type { ToolImplementation as _RootToolImplementation } from '../index.js';
// @ts-expect-error tool execution handler aliases are internal compiler plumbing.
import type { ToolExecutionHandler as _RootToolExecutionHandler } from '../index.js';
// @ts-expect-error tool render handler aliases are internal compiler plumbing.
import type { ToolCallRender as _RootToolCallRender } from '../index.js';
// @ts-expect-error tool handler aliases are internal compiler plumbing.
import type { ToolHandlers as _RootToolHandlers } from '../index.js';
// @ts-expect-error tool observer handler aliases are not part of the public API.
import type { ToolObserverHandler as _RootToolObserverHandler } from '../index.js';
// @ts-expect-error core tool output coercion is internal compiler plumbing.
import { resolveToolOutput as _RootResolveToolOutput } from '../index.js';
// @ts-expect-error Agent-local Zod tool definitions are internal compiler plumbing.
import type { ToolDefinition as _RootToolDefinition } from '../index.js';
// @ts-expect-error Agent-local loose Zod tool definitions are internal compiler plumbing.
import type { AnyToolDefinition as _RootAnyToolDefinition } from '../index.js';
// @ts-expect-error Mini-ACP tool definitions are not re-exported through Agent core.
import type { SerializedToolDefinition as _RootSerializedToolDefinition } from '../index.js';
// @ts-expect-error core controller constructor is not public API.
import { createAgentController as _RootCreateAgentController } from '../index.js';
// @ts-expect-error core controller type is not public API.
import type { AgentController as _RootAgentController } from '../index.js';
// @ts-expect-error core runtime session internals are not public API.
import type { Session as _RootSession } from '../index.js';
// @ts-expect-error MaybePromise is an internal utility, not public Agent API.
import type { MaybePromise as _RootMaybePromise } from '../index.js';
// @ts-expect-error web default constants are internal implementation details.
import { DEFAULT_WEB_FETCH_OPTIONS as _RootDefaultWebFetchOptions } from '../index.js';
// @ts-expect-error web default constants are internal implementation details.
import { DEFAULT_WEB_SEARCH_OPTIONS as _RootDefaultWebSearchOptions } from '../index.js';
// @ts-expect-error web fetch processing shape is internal tool implementation detail.
import type { WebFetchProcessedResult as _RootWebFetchProcessedResult } from '../index.js';
// @ts-expect-error web search output variants stay behind the public union.
import type { WebSearchSuccessOutput as _RootWebSearchSuccessOutput } from '../index.js';
// @ts-expect-error web search output variants stay behind the public union.
import type { WebSearchErrorOutput as _RootWebSearchErrorOutput } from '../index.js';
// @ts-expect-error web search provider metadata shape stays behind the public union.
import type { WebSearchProviderMetadata as _RootWebSearchProviderMetadata } from '../index.js';
// @ts-expect-error web search provider failure shape stays behind the public union.
import type { WebSearchProviderFailure as _RootWebSearchProviderFailure } from '../index.js';

const _statusKey: StoreKey<'status', StatusState> = statusExtension.keys.status;
const _todoKey: StoreKey<'todo', Todo[]> = todoExtension.keys.todo;
const _titleKey: StoreKey<'conversationTitle', ConversationTitle> =
	conversationTitleExtension.keys.title;

type _StatusValue = StoreValueType<typeof statusExtension.keys.status>;
type _TodoValue = StoreValueType<typeof todoExtension.keys.todo>;
type _TitleValue = StoreValueType<typeof conversationTitleExtension.keys.title>;

const _statusValue = null as unknown as _StatusValue;
const _todoValue = null as unknown as _TodoValue;
const _titleValue = null as unknown as _TitleValue;

const _statusState: StatusState = _statusValue;
const _todos: Todo[] = _todoValue;
const _title: ConversationTitle = _titleValue;
const _webOptions: WebExtensionOptions = { fetch: {}, search: {} };
const _webFetchOptions: WebFetchExtensionOptions = {
	timeoutMs: 1,
	maxRedirects: 1,
	maxOutputChars: 1,
};
const _webSearchOptions: WebSearchExtensionOptions = {
	timeoutMs: 1,
	maxRedirects: 1,
	maxResults: 1,
	maxRetries: 1,
	retryDelayMsRange: [1, 2],
};
const _webSearchResult: WebSearchResult = {
	title: 'Title',
	url: 'https://example.com',
	snippet: 'Snippet',
};
const _webSearchOutput: WebSearchOutput = {
	kind: 'success',
	query: 'query',
	provider: { id: 'provider', name: 'Provider' },
	results: [_webSearchResult],
};
const _webSearchProvider: WebSearchProvider = {
	id: 'provider',
	name: 'Provider',
	search: async (_request) => [],
};
const _webSearchRequest = null as unknown as WebSearchProviderRequest;

void _statusKey;
void _todoKey;
void _titleKey;
void _statusState;
void _todos;
void _title;
void _webOptions;
void _webFetchOptions;
void _webSearchOptions;
void _webSearchOutput;
void _webSearchProvider;
void _webSearchRequest;

const _guardKey: StoreKey<'guard', number> = storeKey<'guard', number>('guard');
void _guardKey;
void createStore(0);
void createWebExtension;
void createDuckDuckGoWebSearchProvider;
void createExaWebSearchProvider;
void defineExtension<[]>()(() => {});
void toolSpec('guard', 'typecheck guard', z.object({}));
void DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID;
void EXA_WEB_SEARCH_PROVIDER_ID;
void webFetchExtension;
void webSearchExtension;
void webSearchProviders;
void webSearchToolExtension;

void _RootCoreState;
void _RootEnvironmentState;
void _RootStoreMapping;
void _RootCreateEnvironmentRuntime;
void _RootCreateStoreRuntime;
void _RootStoreStateHandle;
void _RootCoreStateHandle;
void _RootCreateCoreCompiler;
void _RootSerializeTool;
void _RootToToolInputSchema;
void _RootResolveToolOutput;
void _RootCreateAgentController;
void _RootDefaultWebFetchOptions;
void _RootDefaultWebSearchOptions;
