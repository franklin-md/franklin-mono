import type {
	AdapterOptions,
	ManagedAgentAdapter,
	ManagedAgentCommand,
	ManagedAgentCommandResult,
	ManagedAgentEvent,
} from '@franklin/managed-agent';

// ---------------------------------------------------------------------------
// Mock adapter for TUI development
// ---------------------------------------------------------------------------

const MOCK_RESPONSES = [
	'Hello! I can help you with that.',
	"That's an interesting question. Let me think about it...",
	"Sure! Here's what I'd suggest:\n\n1. Start with the basics\n2. Build incrementally\n3. Test as you go",
	'I understand. Could you provide more details about what you need?',
	'Great idea! Let me work on that for you.\n\nDone! Everything looks good.',
];

function delay(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

export class MockAdapter implements ManagedAgentAdapter {
	private readonly emit: (event: ManagedAgentEvent) => void;
	private disposed = false;
	private responseIndex = 0;

	constructor(options: AdapterOptions) {
		this.emit = options.onEvent;
	}

	/** Check disposed state — separated to prevent TypeScript from narrowing across awaits. */
	private isDisposed(): boolean {
		return this.disposed;
	}

	async dispatch(
		command: ManagedAgentCommand,
	): Promise<ManagedAgentCommandResult> {
		if (this.isDisposed()) {
			return {
				ok: false,
				error: { code: 'DISPOSED', message: 'Adapter is disposed' },
			};
		}

		switch (command.type) {
			case 'session.start':
				this.handleSessionStart();
				break;
			case 'turn.start':
				this.handleTurnStart(command.input[0]?.text ?? '');
				break;
			case 'permission.resolve':
				this.emit({ type: 'permission.resolved', payload: command });
				break;
			case 'session.resume':
			case 'session.fork':
			case 'turn.interrupt':
				// Not implemented in mock
				break;
		}

		return { ok: true };
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.emit({ type: 'agent.exited' });
	}

	private handleSessionStart(): void {
		// Emit ready + session started after a short delay
		setTimeout(() => {
			if (this.isDisposed()) return;
			this.emit({ type: 'agent.ready' });
			this.emit({ type: 'session.started' });
		}, 50);
	}

	private handleTurnStart(userText: string): void {
		const response =
			MOCK_RESPONSES[this.responseIndex % MOCK_RESPONSES.length] ??
			MOCK_RESPONSES[0] ??
			'';
		this.responseIndex++;

		// Simulate streaming in the background
		void this.streamResponse(userText, response);
	}

	private async streamResponse(
		userText: string,
		response: string,
	): Promise<void> {
		if (this.isDisposed()) return;

		// Emit user message item
		this.emit({
			type: 'item.started',
			item: { kind: 'user_message', text: userText },
		});
		this.emit({
			type: 'item.completed',
			item: { kind: 'user_message', text: userText },
		});

		// Start turn
		this.emit({ type: 'turn.started' });

		await delay(100);
		if (this.isDisposed()) return;

		// Occasionally emit a permission prompt
		if (this.responseIndex % 3 === 0) {
			this.emit({
				type: 'permission.requested',
				payload: { kind: 'generic', message: 'Allow mock tool execution?' },
			});
			// In real usage, the TUI would dispatch permission.resolve
			// For mock, we'll just continue after a brief pause
			await delay(200);
			if (this.isDisposed()) return;
		}

		// Start assistant message
		this.emit({
			type: 'item.started',
			item: { kind: 'assistant_message' },
		});

		// Stream chunks
		const words = response.split(' ');
		for (let i = 0; i < words.length; i++) {
			await delay(30);
			if (this.isDisposed()) return;

			const word = words[i] ?? '';
			const textDelta = (i === 0 ? '' : ' ') + word;
			this.emit({
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta },
			});
		}

		// Complete the item
		this.emit({
			type: 'item.completed',
			item: { kind: 'assistant_message', text: response },
		});

		// Complete the turn
		this.emit({ type: 'turn.completed' });
	}
}
