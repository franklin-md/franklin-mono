import { z } from 'zod';

import type {
	ConversationTitle,
	StatusState,
	StoreKey,
	StoreValueType,
	Todo,
} from '../index.js';
import {
	conversationTitleExtension,
	createStore,
	defineExtension,
	statusExtension,
	storeKey,
	todoExtension,
	toolSpec,
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
// @ts-expect-error core runtime agent state is internal module plumbing.
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
// @ts-expect-error Agent-local Zod tool definitions are internal compiler plumbing.
import type { ToolDefinition as _RootToolDefinition } from '../index.js';
// @ts-expect-error Agent-local loose Zod tool definitions are internal compiler plumbing.
import type { AnyToolDefinition as _RootAnyToolDefinition } from '../index.js';
// @ts-expect-error Mini-ACP tool definitions are not re-exported through Agent core.
import type { SerializedToolDefinition as _RootSerializedToolDefinition } from '../index.js';
// @ts-expect-error core runtime agent state/session internals are not public API.
import type { RuntimeAgentState as _RootRuntimeAgentState } from '../index.js';
// @ts-expect-error core runtime session internals are not public API.
import type { Session as _RootSession } from '../index.js';
// @ts-expect-error MaybePromise is an internal utility, not public Agent API.
import type { MaybePromise as _RootMaybePromise } from '../index.js';

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

void _statusKey;
void _todoKey;
void _titleKey;
void _statusState;
void _todos;
void _title;

const _guardKey: StoreKey<'guard', number> = storeKey<'guard', number>('guard');
void _guardKey;
void createStore(0);
void defineExtension<[]>()(() => {});
void toolSpec('guard', 'typecheck guard', z.object({}));

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
