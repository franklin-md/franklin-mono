import type { TurnClient } from '../base/types.js';
import { createSessionAdapter } from '../protocol/adapter.js';
import { ContextTracker } from '../protocol/context-tracker.js';
import { trackAgent, trackClient } from '../protocol/tracking.js';
import type {
	MiniACPAgent,
	MiniACPClientHandle,
	MiniACPConnector,
} from '../protocol/index.js';
import type { Context } from '../types/context.js';
import type { StreamEvent } from '../types/stream.js';
import type { MockTurnDescriptor } from './descriptor/index.js';
import { executeMockTurn } from './execute.js';
import {
	createRecording,
	resetRecording,
	snapshotRecording,
	type MockMiniACPRecording,
} from './recording.js';

export type CreateMockMiniACPOptions = {
	readonly turns?: readonly MockTurnDescriptor[];
	readonly defaultTurn?: MockTurnDescriptor;
};

export type MockMiniACP = {
	readonly connector: MiniACPConnector;
	enqueue(turn: MockTurnDescriptor): void;
	context(): Context;
	calls(): MockMiniACPRecording;
	reset(): void;
};

export function createMockMiniACP(
	options: CreateMockMiniACPOptions = {},
): MockMiniACP {
	const initialTurns = [...(options.turns ?? [])];
	const pendingTurns = [...initialTurns];
	const recording = createRecording();
	const tracker = new ContextTracker();
	let messageId = 0;
	let toolCallId = 0;

	function nextMessageId(): string {
		messageId += 1;
		return `mock-message-${messageId}`;
	}

	function nextToolCallId(): string {
		toolCallId += 1;
		return `mock-tool-call-${toolCallId}`;
	}

	function connector(server: MiniACPAgent): MiniACPClientHandle {
		const trackedServer = trackAgent(tracker, server);
		const client = createSessionAdapter(
			(context, turnServer) =>
				createMockTurnClient({
					context,
					server: turnServer,
					dequeueTurn,
					recording,
					nextMessageId,
					nextToolCallId,
				}),
			trackedServer,
		);
		const trackedClient = trackClient(tracker, client);

		return {
			async initialize() {
				recording.initialize += 1;
				return trackedClient.initialize();
			},
			async setContext(context) {
				recording.setContext.push(context);
				return trackedClient.setContext(context);
			},
			prompt(message) {
				recording.prompts.push(message);
				return trackedClient.prompt(message);
			},
			async cancel() {
				recording.cancels += 1;
				return trackedClient.cancel();
			},
			async dispose() {
				recording.disposes += 1;
			},
		};
	}

	function dequeueTurn(): MockTurnDescriptor {
		const next = pendingTurns.shift();
		if (next) return next;
		if (options.defaultTurn) return options.defaultTurn;
		throw new Error('No mock turn descriptor scheduled for prompt.');
	}

	return {
		connector,
		enqueue(turn) {
			pendingTurns.push(turn);
		},
		context() {
			return tracker.get();
		},
		calls() {
			return snapshotRecording(recording);
		},
		reset() {
			pendingTurns.splice(0, pendingTurns.length, ...initialTurns);
			resetRecording(recording);
			tracker.reset();
			messageId = 0;
			toolCallId = 0;
		},
	};
}

type CreateMockTurnClientInput = {
	readonly context: Context;
	readonly server: MiniACPAgent;
	readonly dequeueTurn: () => MockTurnDescriptor;
	readonly recording: ReturnType<typeof createRecording>;
	readonly nextMessageId: () => string;
	readonly nextToolCallId: () => string;
};

function createMockTurnClient(input: CreateMockTurnClientInput): TurnClient {
	return {
		async *prompt(message): AsyncGenerator<StreamEvent> {
			yield* executeMockTurn({
				descriptor: input.dequeueTurn(),
				context: input.context,
				prompt: message,
				server: input.server,
				recording: input.recording,
				nextMessageId: input.nextMessageId,
				nextToolCallId: input.nextToolCallId,
			});
		},
		async cancel() {},
	};
}
