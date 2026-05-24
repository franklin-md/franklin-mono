import { createMemoryStream } from '@franklin/lib/transport';
import { Agent as PiCoreAgent } from '@earendil-works/pi-agent-core';
import type {
	AgentEvent,
	AgentLoopTurnUpdate,
} from '@earendil-works/pi-agent-core';
import type { StreamFn } from '@earendil-works/pi-agent-core';

import { ContextTracker } from '../../protocol/context-tracker.js';
import { trackAgent } from '../../protocol/tracking.js';
import type { MuAgent, MuClient } from '../../protocol/types.js';
import type { Context, ContextPatch } from '../../types/context.js';
import type { UserMessage } from '../../types/message.js';
import { StopCode } from '../../types/stop-code.js';
import type { StreamEvent } from '../../types/stream.js';
import type { ToolDefinition } from '../../types/tool.js';
import { resolveConfig } from './resolve-config.js';
import {
	bridgeTool,
	fromAgentEvent,
	toPiMessage,
	toPiUserMessage,
} from './translate/index.js';

export type CreatePiAgentOptions = {
	streamFn?: StreamFn;
};

export function createPiAgent(
	server: MuAgent,
	options: CreatePiAgentOptions = {},
): MuClient {
	const { streamFn } = options;
	const tracker = new ContextTracker();
	const trackedServer = trackAgent(tracker, server);
	let piAgent: PiCoreAgent | null = null;
	let activePrompt = false;
	let pendingTurnContext: ContextPatch | undefined;

	function createPiTools(tools: ToolDefinition[]) {
		const handler = trackedServer.toolExecute.bind(trackedServer);
		return tools.map((def) => bridgeTool(def, handler));
	}

	return {
		async initialize() {},

		async setContext(context: ContextPatch) {
			if (!activePrompt) {
				tracker.apply(context);
				return;
			}

			if (context.tools !== undefined) {
				tracker.apply({ tools: context.tools });
			}

			const deferred = turnDeferredContext(context);
			if (deferred) {
				pendingTurnContext = mergeContextPatch(pendingTurnContext, deferred);
			}
		},

		async *prompt(message: UserMessage): AsyncGenerator<StreamEvent> {
			if (activePrompt) {
				throw new Error('Mini-ACP prompt already in progress');
			}

			activePrompt = true;
			const initialContext = snapshotContext(tracker.get());
			tracker.append(message);

			try {
				for await (const event of promptPiAgent({
					context: initialContext,
					message,
					createPiTools,
					getLiveTools: () => tracker.get().tools,
					setActiveAgent: (agent) => {
						piAgent = agent;
					},
					streamFn,
				})) {
					if (event.type === 'update') {
						tracker.append(event.message);
					}
					yield event;
				}
			} finally {
				piAgent = null;
				activePrompt = false;
				if (pendingTurnContext) {
					const deferred = pendingTurnContext;
					pendingTurnContext = undefined;
					tracker.apply(deferred);
				}
			}
		},

		async cancel(): Promise<void> {
			piAgent?.abort();
		},
	};
}

type PromptPiAgentInput = {
	readonly context: Context;
	readonly message: UserMessage;
	readonly createPiTools: (
		tools: ToolDefinition[],
	) => ReturnType<typeof bridgeTool>[];
	readonly getLiveTools: () => ToolDefinition[];
	readonly setActiveAgent: (agent: PiCoreAgent) => void;
	readonly streamFn?: StreamFn;
};

async function* promptPiAgent(
	input: PromptPiAgentInput,
): AsyncGenerator<StreamEvent> {
	const resolved = resolveConfig(input.context.config);
	if (!resolved.ok) {
		yield { type: 'turnStart' };
		yield resolved.turnEnd;
		return;
	}

	const agentRef: { current?: PiCoreAgent } = {};
	const prepareNextTurn = (): AgentLoopTurnUpdate | undefined => {
		const current = agentRef.current;
		if (!current) return undefined;
		return {
			context: {
				systemPrompt: current.state.systemPrompt,
				messages: [...current.state.messages],
				tools: input.createPiTools(input.getLiveTools()),
			},
		};
	};

	const agent = new PiCoreAgent({
		initialState: {
			systemPrompt: input.context.systemPrompt,
			model: resolved.model,
			thinkingLevel: input.context.config.reasoning ?? 'off',
			tools: input.createPiTools(input.context.tools),
			messages: input.context.messages.map(toPiMessage),
		},
		getApiKey: (_: string) => {
			return input.context.config.apiKey;
		},
		prepareNextTurn,
		streamFn: input.streamFn,
	});
	agentRef.current = agent;
	input.setActiveAgent(agent);

	let currentMessageId = crypto.randomUUID();
	const { readable, writable } = createMemoryStream<StreamEvent>();
	const writer = writable.getWriter();

	const unsub = agent.subscribe((event: AgentEvent) => {
		if (event.type === 'message_start') {
			currentMessageId = crypto.randomUUID();
		}
		const streamEvent = fromAgentEvent(event, currentMessageId);
		if (streamEvent) {
			void writer.write(streamEvent);
		}
	});

	const piMessage = toPiUserMessage(input.message);
	agent
		.prompt(piMessage)
		.then(() => {
			void writer.close();
		})
		.catch(() => {
			void writer.write({
				type: 'turnEnd',
				stopCode: StopCode.LlmError,
				stopMessage: 'An error occurred while prompting the agent',
			});
			void writer.close();
		});

	try {
		yield* readable;
	} finally {
		unsub();
	}
}

function snapshotContext(context: Context): Context {
	return {
		systemPrompt: context.systemPrompt,
		messages: [...context.messages],
		tools: [...context.tools],
		config: { ...context.config },
	};
}

function turnDeferredContext(context: ContextPatch): ContextPatch | undefined {
	const deferred: ContextPatch = {};
	if (context.systemPrompt !== undefined) {
		deferred.systemPrompt = context.systemPrompt;
	}
	if (context.messages !== undefined) {
		deferred.messages = context.messages;
	}
	if (context.config !== undefined) {
		deferred.config = context.config;
	}
	return hasContextPatch(deferred) ? deferred : undefined;
}

function mergeContextPatch(
	current: ContextPatch | undefined,
	next: ContextPatch,
): ContextPatch {
	const merged: ContextPatch = { ...(current ?? {}) };
	if (next.systemPrompt !== undefined) {
		merged.systemPrompt = next.systemPrompt;
	}
	if (next.messages !== undefined) {
		merged.messages = next.messages;
	}
	if (next.tools !== undefined) {
		merged.tools = next.tools;
	}
	if (next.config !== undefined) {
		merged.config = { ...(merged.config ?? {}), ...next.config };
	}
	return merged;
}

function hasContextPatch(context: ContextPatch): boolean {
	return (
		context.systemPrompt !== undefined ||
		context.messages !== undefined ||
		context.tools !== undefined ||
		context.config !== undefined
	);
}
