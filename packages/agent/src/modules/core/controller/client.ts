import type { MiniACPClientHandle } from '@franklin/mini-acp';
import type { CoreRegistry } from '../registrations/index.js';
import type { ToolRegistry } from '../tools/index.js';
import type { AgentSession } from './session.js';
import { createPromptBuilder, createPromptObservers } from './prompt.js';

type BindAgentClientInput = {
	readonly client: MiniACPClientHandle;
	readonly registrations: CoreRegistry;
	readonly session: AgentSession;
	readonly toolRegistry: ToolRegistry;
};

export function bindAgentClient({
	client,
	registrations,
	session,
	toolRegistry,
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
			session.begin();
			try {
				await toolRegistry.prepare(session.signal());
				await session.sync(client);
				const fullPrompt = await buildPrompt(message);
				session.recordMessage(fullPrompt);

				for await (const event of client.prompt(fullPrompt)) {
					if (event.type === 'turnEnd' && event.usage) {
						session.addUsage(event.usage);
					}
					if (event.type === 'update') {
						session.recordMessage(event.message, event.messageId);
					}
					notifyPromptObservers(event);
					yield event;
				}
			} finally {
				session.end();
			}
		},
		async cancel() {
			session.cancel();
			await client.cancel();
		},
		async dispose() {
			session.cancel();
			try {
				await toolRegistry.dispose();
			} finally {
				await client.dispose();
			}
		},
	};
}
