// ---------------------------------------------------------------------------
// Spec Tester — types
//
// The transcript is a flat log of everything that crossed the wire,
// ordered as seen from the CLIENT side.
// ---------------------------------------------------------------------------

import type { Ctx } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import type { Chunk, TurnStart, Update, TurnEnd } from '../types/stream.js';
import type { ToolCall, ToolDefinition, ToolResult } from '../types/tool.js';
import type { AgentProtocol } from '../protocol/types.js';

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

export type TranscriptEntry =
	| { direction: 'send'; method: 'initialize'; params: Record<string, never> }
	| { direction: 'send'; method: 'setContext'; params: Partial<Ctx> }
	| { direction: 'send'; method: 'prompt'; params: UserMessage }
	| { direction: 'send'; method: 'cancel'; params: Record<string, never> }
	| { direction: 'send'; method: 'toolResult'; params: ToolResult }
	| { direction: 'receive'; method: 'turnStart'; params: TurnStart }
	| { direction: 'receive'; method: 'chunk'; params: Chunk }
	| { direction: 'receive'; method: 'update'; params: Update }
	| { direction: 'receive'; method: 'turnEnd'; params: TurnEnd }
	| {
			direction: 'receive';
			method: 'toolExecute';
			params: { call: ToolCall };
	  }
	| {
			direction: 'receive';
			method: 'initialize';
			params: Record<string, never>;
	  }
	| {
			direction: 'receive';
			method: 'setContext';
			params: Record<string, never>;
	  };

export type Transcript = TranscriptEntry[];

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export type SpecResult = 'pass' | 'fail' | 'skip';

export type SpecPoint = {
	id: string;
	description: string;
	test: (transcript: Transcript) => SpecResult;
};

// ---------------------------------------------------------------------------
// Fixture DSL
// ---------------------------------------------------------------------------

export type ToolSpec = {
	definition: ToolDefinition;
	handler: (call: ToolCall) => ToolResult | Promise<ToolResult>;
};

export type SetContextPayload = Partial<
	Omit<Ctx, 'tools'> & { tools: ToolSpec[] }
>;

export type Action =
	| { type: 'initialize' }
	| { type: 'setContext'; ctx: SetContextPayload }
	| { type: 'prompt'; message: UserMessage }
	| { type: 'cancel' }
	| {
			type: 'waitFor';
			predicate: (entry: TranscriptEntry) => boolean;
			timeoutMs?: number;
	  };

export type Fixture = {
	name: string;
	actions: Action[];
};

// ---------------------------------------------------------------------------
// Agent factory — receives one end of a duplex pair, binds an agent to it
// ---------------------------------------------------------------------------

export type AgentFactory = (transport: AgentProtocol) => void;

// ---------------------------------------------------------------------------
// Suite results — coverage matrix
// ---------------------------------------------------------------------------

export type CellResult = { specId: string; result: SpecResult };

export type FixtureResult = {
	fixture: string;
	transcript: Transcript;
	specs: CellResult[];
};

export type SuiteResult = { fixtures: FixtureResult[] };
