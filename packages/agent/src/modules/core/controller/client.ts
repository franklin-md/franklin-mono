import type { MiniACPClientHandle } from '@franklin/mini-acp';
import type { CoreRegistry } from '../registrations/index.js';
import type { AgentSession } from './session.js';
import type { AgentClient } from './types.js';
import { createPromptBuilder, createPromptObservers } from './prompt.js';

type BindAgentClientInput = {
	readonly client: MiniACPClientHandle;
	readonly registrations: CoreRegistry;
	readonly session: AgentSession;
};

export function bindAgentClient({
	client,
	registrations,
	session,
}: BindAgentClientInput): AgentClient {
	const buildPrompt = createPromptBuilder(registrations);
	const notifyPromptObservers = createPromptObservers(registrations);
	let active: object | undefined;

	return {
		initialize: client.initialize.bind(client),
		async setContext(context) {
			await client.setContext(context);
			session.recordContext(context);
		},
		async *prompt(message) {
			if (active) throw new Error('Franklin prompt already in progress');
			const run = {};
			active = run;
			let paused = false;
			try {
				await session.sync(client);
				const fullPrompt = await buildPrompt(message);
				session.recordMessage(fullPrompt);

				let stream = client.prompt(fullPrompt);
				for (;;) {
					paused = false;
					for await (const event of stream) {
						if (event.type === 'stepEnd' || event.type === 'turnEnd') {
							const usage =
								event.stepUsage ??
								(event.type === 'turnEnd' ? event.usage : undefined);
							if (usage) session.addUsage(usage);
						}
						if (event.type === 'stepEnd') {
							paused = true;
							continue;
						}
						if (event.type === 'update') {
							session.recordMessage(event.message);
						}
						if (event.type === 'turnEnd') {
							paused = false;
							active = undefined;
						}
						notifyPromptObservers(event);
						yield event;
					}
					if (!paused) return;
					// The terminal guarantees idle. Ordinary synchronization here picks up
					// dynamic prompts/tools without a reverse-RPC acknowledgement barrier.
					await session.sync(client);
					stream = client.continue();
					paused = false;
				}
			} finally {
				if (paused) {
					// A failed idle sync must not strand the raw client in a paused turn.
					await client.cancel();
					for await (const _event of client.continue()) {
						/* drain cancellation */
					}
				}
				if (active === run) active = undefined;
			}
		},
		async cancel() {
			// Future cancellation policy belongs here: the controller is the one place
			// that sees both Mini-ACP turn cancellation and app-side tool execution, so
			// any safe termination of in-flight tools should be coordinated from this
			// boundary.
			await client.cancel();
		},
		dispose: client.dispose.bind(client),
	};
}
