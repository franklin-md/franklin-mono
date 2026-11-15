import { StopCode, ZERO_USAGE } from '@franklin/mini-acp';
import type { MiniACPClientHandle } from '@franklin/mini-acp';
import { UsageTracker } from '@franklin/mini-acp/session';
import type { CoreRegistry } from '../registrations/index.js';
import type { AgentSession } from './session.js';
import type { AgentClient } from './types.js';
import type { createControllerOperation } from './operation.js';
import { RuntimeStopCode } from '../turn/runtime-stop-code.js';
import type { AgentTurnEnd } from '../turn/types.js';
import { createPromptBuilder, createPromptObservers } from './prompt.js';

type BindAgentClientInput = {
	readonly client: MiniACPClientHandle;
	readonly registrations: CoreRegistry;
	readonly session: AgentSession;
	readonly operation: ReturnType<typeof createControllerOperation>;
};

export function bindAgentClient({
	client,
	registrations,
	session,
	operation,
}: BindAgentClientInput): AgentClient {
	const buildPrompt = createPromptBuilder(registrations);
	const notifyPromptObservers = createPromptObservers(registrations);
	return {
		initialize: client.initialize.bind(client),
		async setContext(context) {
			await client.setContext(context);
			session.recordContext(context);
		},
		async *prompt(message) {
			const run = operation.begin();
			const usage = new UsageTracker();
			let paused = false;
			let preparing = false;
			let settled = false;
			const drainPaused = async () => {
				if (!paused) return;
				paused = false;
				await client.cancel();
				for await (const _event of client.continue()) {
					// The prior step's usage is already recorded. Paused cancellation adds
					// zero usage; its terminal stays internal to the runtime logical turn.
				}
			};
			try {
				await session.sync(client);
				const fullPrompt = await buildPrompt(message);
				preparing = true;
				await session.prepare(client, run.signal, fullPrompt);
				preparing = false;
				session.recordMessage(fullPrompt);
				let stream = client.prompt(fullPrompt);
				for (;;) {
					paused = false;
					for await (const event of stream) {
						if (event.type === 'stepEnd' || event.type === 'turnEnd') {
							session.addUsage(event.stepUsage);
							usage.add(event.stepUsage);
						}
						if (event.type === 'stepEnd') {
							paused = true;
							continue;
						}
						if (event.type === 'update') session.recordMessage(event.message);
						if (event.type === 'turnEnd') {
							settled = true;
							operation.end(run);
						}
						notifyPromptObservers(event);
						yield event;
					}
					if (!paused) return;
					// A step terminal guarantees idle before ordinary sync and compaction.
					await session.sync(client);
					preparing = true;
					await session.prepare(client, run.signal);
					preparing = false;
					stream = client.continue();
					paused = false;
				}
			} catch (error) {
				if (settled || (!preparing && !run.signal.aborted)) throw error;
				const terminal: AgentTurnEnd = {
					type: 'turnEnd',
					stopCode: run.signal.aborted
						? StopCode.Cancelled
						: RuntimeStopCode.CompactionFailure,
					stopMessage: run.signal.aborted
						? undefined
						: error instanceof Error
							? error.message
							: String(error),
					stepUsage: ZERO_USAGE,
					usage: usage.get(),
				};
				// Before initial prompt there is nothing to cancel. At an idle boundary,
				// settle the raw turn first, then publish the runtime's actual outcome.
				await drainPaused();
				operation.end(run);
				notifyPromptObservers(terminal);
				yield terminal;
			} finally {
				try {
					await drainPaused();
				} finally {
					operation.end(run);
				}
			}
		},
		async cancel() {
			operation.cancel();
			// Future cancellation policy belongs here: the controller is the one place
			// that sees both Mini-ACP turn cancellation and app-side tool execution, so
			// any safe termination of in-flight tools should be coordinated from this
			// boundary. Paused raw turns are drained by the prompt driver.
			await client.cancel();
		},
		async dispose() {
			operation.cancel();
			await client.dispose();
		},
	};
}
