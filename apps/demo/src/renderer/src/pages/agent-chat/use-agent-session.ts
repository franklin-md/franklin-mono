import { useEffect, useRef, useState } from 'react';

import {
	ConversationExtension,
	TodoExtension,
	QAExtension,
	PROTOCOL_VERSION,
} from '@franklin/agent/browser';
import type { AgentCommands } from '@franklin/agent/browser';
import { ElectronFramework } from '@franklin/electron/renderer';

export type SessionStatus = 'loading' | 'ready' | 'error';

export interface AgentSession {
	commands: AgentCommands;
	sessionId: string | undefined;
	todoExt: TodoExtension;
	conversationExt: ConversationExtension;
	qaExt: QAExtension;
	status: SessionStatus;
	error?: string;
}

// No-op commands proxy returned while session is initializing.
const noopCommands = new Proxy({} as AgentCommands, {
	get: () => () => Promise.resolve(),
});

export function useAgentSession(): AgentSession {
	const [status, setStatus] = useState<SessionStatus>('loading');
	const [error, setError] = useState<string>();
	const [sessionId, setSessionId] = useState<string>();

	const sessionRef = useRef<{
		commands: AgentCommands;
		dispose: () => Promise<void>;
	}>();

	// Extensions are created once, held in a ref so they survive re-renders.
	const todoExt = useRef(new TodoExtension()).current;
	const conversationExt = useRef(new ConversationExtension()).current;
	const qaExt = useRef(new QAExtension()).current;

	useEffect(() => {
		const disposedRef = { current: false };

		async function init() {
			const framework = new ElectronFramework();

			try {
				const env = await framework.provision();

				if (disposedRef.current) {
					await env.dispose();
					return;
				}

				const transport = await env.spawn('claude-acp');
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated across await
				if (disposedRef.current) {
					await env.dispose();
					return;
				}

				const middleware = await framework.compileExtensions([
					conversationExt,
					todoExt,
					qaExt,
				]);
				const { commands, dispose } = framework.connect(transport, middleware);

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated across await
				if (disposedRef.current) {
					await dispose();
					await env.dispose();
					return;
				}

				// Initialize + create session
				await commands.initialize({
					clientInfo: {
						name: 'franklin-demo',
						version: '0.1.0',
					},
					protocolVersion: PROTOCOL_VERSION,
				});
				const { sessionId: sid } = await commands.newSession({
					cwd: '/tmp',
					mcpServers: [],
				});
				setSessionId(sid);

				sessionRef.current = {
					commands,
					dispose: async () => {
						await dispose();
						await env.dispose();
						await framework.dispose();
					},
				};

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated across await
				if (!disposedRef.current) {
					setStatus('ready');
				}
			} catch (err) {
				if (!disposedRef.current) {
					setError(err instanceof Error ? err.message : String(err));
					setStatus('error');
				}
			}
		}

		void init();

		return () => {
			disposedRef.current = true;
			void sessionRef.current?.dispose();
		};
	}, [todoExt, conversationExt, qaExt]);

	const commands = sessionRef.current?.commands ?? noopCommands;

	return { commands, sessionId, todoExt, conversationExt, qaExt, status, error };
}
