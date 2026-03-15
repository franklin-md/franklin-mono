import type {
	AgentCommands,
	AgentEvents,
	Middleware,
	PromptRequest,
	PromptResponse,
	RequestPermissionResponse,
	SessionNotification,
} from '@franklin/agent';
import { emptyMiddleware } from '@franklin/agent';

export interface TranscriptEntry {
	id: string;
	receivedAt: number;
	notification: SessionNotification;
}

export interface AgentSessionSnapshot {
	transcript: readonly TranscriptEntry[];
}

export interface AgentSessionStore {
	subscribe(listener: () => void): () => void;
	getSnapshot(): AgentSessionSnapshot;
}

export interface ReactAgentSession {
	commands: AgentCommands;
	sessionId: string;
	store: AgentSessionStore;
	dispose(): Promise<void>;
}

const EMPTY_SNAPSHOT: AgentSessionSnapshot = {
	transcript: [],
};

export function createSessionStore(): {
	store: AgentSessionStore;
	middleware: Middleware;
	handler: Pick<AgentEvents, 'requestPermission' | 'sessionUpdate'>;
} {
	const listeners = new Set<() => void>();
	let snapshot = EMPTY_SNAPSHOT;
	let nextId = 0;

	function emit(nextTranscript: readonly TranscriptEntry[]): void {
		snapshot = { transcript: nextTranscript };
		for (const listener of listeners) {
			listener();
		}
	}

	function append(notification: SessionNotification): void {
		emit([
			...snapshot.transcript,
			{
				id: `entry-${nextId++}`,
				receivedAt: Date.now(),
				notification,
			},
		]);
	}

	function selectPermissionOption(
		options: ReadonlyArray<{
			kind: string;
			optionId: string;
		}>,
	): string {
		return (
			options.find((option) => option.kind === 'reject_once')?.optionId ??
			options.find((option) => option.kind === 'reject_always')?.optionId ??
			options[0]?.optionId ??
			''
		);
	}

	function createMessageId(): string {
		if (typeof globalThis.crypto.randomUUID === 'function') {
			return globalThis.crypto.randomUUID();
		}

		const bytes = new Uint8Array(16);
		if (typeof globalThis.crypto.getRandomValues === 'function') {
			globalThis.crypto.getRandomValues(bytes);
		} else {
			for (let i = 0; i < bytes.length; i++) {
				bytes[i] = Math.floor(Math.random() * 256);
			}
		}

		bytes[6] = (bytes[6] ?? 0 & 0x0f) | 0x40;
		bytes[8] = (bytes[8] ?? 0 & 0x3f) | 0x80;

		const hex = [...bytes]
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}

	function extractPromptText(prompt: PromptRequest['prompt']): string {
		return prompt
			.filter(
				(block): block is Extract<(typeof prompt)[number], { type: 'text' }> =>
					block.type === 'text',
			)
			.map((block) => block.text)
			.join('');
	}

	return {
		store: {
			subscribe: (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
			getSnapshot: () => snapshot,
		},
		middleware: {
			...emptyMiddleware,
			prompt: async (
				params: PromptRequest,
				next: (params: PromptRequest) => Promise<PromptResponse>,
			) => {
				const messageId = params.messageId ?? createMessageId();
				const text = extractPromptText(params.prompt);

				if (text.length > 0) {
					append({
						sessionId: params.sessionId,
						update: {
							sessionUpdate: 'user_message_chunk',
							messageId,
							content: { type: 'text', text },
						},
					} as SessionNotification);
				}

				return next({
					...params,
					messageId,
				});
			},
		},
		handler: {
			sessionUpdate: async (notification) => {
				append(notification);
			},
			requestPermission: async (request) => {
				console.warn('Auto-rejecting ACP permission request', request);
				const optionId = selectPermissionOption(request.options);
				if (!optionId) {
					throw new Error('Permission request contained no selectable options');
				}
				return {
					outcome: { outcome: 'selected', optionId },
				} satisfies RequestPermissionResponse;
			},
		},
	};
}
