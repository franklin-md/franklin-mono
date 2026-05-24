import type { MiniACPClientHandle } from '@franklin/mini-acp';
import type { CoreRegistry } from '../registrations/index.js';
import type { AgentSession } from './session.js';
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
}: BindAgentClientInput): MiniACPClientHandle {
	const buildPrompt = createPromptBuilder(registrations);
	const notifyPromptObservers = createPromptObservers(registrations);

	return {
		...client,
		async setContext(context) {
			await client.setContext(context);
			session.recordContext(context);
		},
		async *prompt(message) {
			await session.sync(client);
			const fullPrompt = await buildPrompt(message);
			session.recordMessage(fullPrompt);

			for await (const event of client.prompt(fullPrompt)) {
				if (event.type === 'turnEnd' && event.usage) {
					session.addUsage(event.usage);
				}
				if (event.type === 'update') {
					session.recordMessage(event.message);
				}
				notifyPromptObservers(event);
				yield event;
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
