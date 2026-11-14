import { ContextTracker } from '../protocol/context-tracker.js';
import { trackAgent } from '../protocol/tracking.js';
import type {
	MiniACPAgent,
	MiniACPClientHandle,
	MiniACPConnector,
} from '../protocol/index.js';
import type { Context } from '../types/context.js';
import type { StreamEvent } from '../types/stream.js';
import type { UserMessage } from '../types/message.js';
import { StopCode } from '../types/stop-code.js';
import { UsageTracker, ZERO_USAGE } from '../protocol/usage-tracker.js';
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
	// TODO: This field feels off? Isn't this at the wrong phase?
	// Feels like we are createing a new connector (but returns a different api)
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
		let current: AsyncGenerator<StreamEvent> | undefined;
		let active = false;
		let cancelled = false;
		let usage = new UsageTracker();

		async function* drive(message?: UserMessage): AsyncGenerator<StreamEvent> {
			if (active) throw new Error('Mini-ACP drive already in progress');
			if (message && current)
				throw new Error(
					'Mini-ACP turn paused; continue or cancel it before prompt',
				);
			if (!message && !current) return;
			active = true;
			let terminal = false;
			try {
				if (message) {
					recording.prompts.push(message);
					const descriptor = dequeueTurn();
					tracker.append(message);
					cancelled = false;
					usage = new UsageTracker();
					current = executeMockTurn({
						descriptor,
						get context() {
							return tracker.get();
						},
						prompt: message,
						server: trackedServer,
						recording,
						nextMessageId,
						nextToolCallId,
					});
				} else {
					recording.continues += 1;
				}
				while (current) {
					const result = cancelled ? undefined : await current.next();
					const received = result && !result.done ? result.value : undefined;
					let stepUsage = ZERO_USAGE;
					if (received?.type === 'stepEnd' || received?.type === 'turnEnd') {
						stepUsage = received.stepUsage;
						usage.add(stepUsage);
					}
					let event: StreamEvent;
					if (cancelled) {
						event = {
							type: 'turnEnd',
							stopCode: StopCode.Cancelled,
							stepUsage,
							usage: usage.get(),
						};
					} else if (received) {
						event = received;
					} else {
						throw new Error('Mock turn descriptor must include turnEnd().');
					}
					if (event.type === 'update') tracker.append(event.message);
					if (event.type === 'stepEnd' || event.type === 'turnEnd') {
						if (event.type === 'turnEnd') {
							event = { ...event, usage: usage.get() };
							if (!cancelled) await current.next();
							await current.return(undefined);
							current = undefined;
						}
						terminal = true;
						active = false;
						yield event;
						return;
					}
					yield event;
				}
			} finally {
				// State is released before a terminal is delivered; an older drive's
				// generator cleanup must not change a reentrant drive's busy state.
				if (!terminal) active = false;
			}
		}

		return {
			async initialize() {
				recording.initialize += 1;
			},
			async setContext(context) {
				if (active) throw new Error('Mock setContext requires an idle drive');
				recording.setContext.push(context);
				tracker.apply(context);
			},
			prompt: (message) => drive(message),
			continue: () => drive(),
			async cancel() {
				recording.cancels += 1;
				cancelled = current !== undefined;
			},
			async dispose() {
				recording.disposes += 1;
				cancelled = true;
				await current?.return(undefined);
				current = undefined;
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
