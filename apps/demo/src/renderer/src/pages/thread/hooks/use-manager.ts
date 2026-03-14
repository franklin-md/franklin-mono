import { useMemo } from 'react';
import { AgentManager } from '@franklin/react-agents/browser';
import {
	AgentConnection,
	createModuleMiddleware,
	createThreadModule,
} from '@franklin/agent/browser';
import type { ThreadRequest } from '@franklin/agent/browser';

import { createRendererIpcTransport } from '@/lib/ipc-transport';
import { IpcMcpTransport } from '@/lib/ipc-mcp-transport';

export function useManager(): AgentManager {
	return useMemo(() => {
		const manager: AgentManager = new AgentManager({
			createConnection: async (agent, cwd) => {
				const agentId = await window.franklinBridge.spawn(agent, cwd);
				const transport = createRendererIpcTransport(agentId);
				return new AgentConnection(transport);
			},
			createMiddlewares: () => [
				createModuleMiddleware(
					createThreadModule({
						onNewThread: async (
							req: ThreadRequest,
						): Promise<{ threadId: string }> => {
							const session = await manager.spawn('codex', req.cwd ?? '/tmp');
							void session.prompt(req.task);
							return { threadId: session.id };
						},
						transport: new IpcMcpTransport(),
					}),
				),
			],
		});
		return manager;
	}, []);
}
