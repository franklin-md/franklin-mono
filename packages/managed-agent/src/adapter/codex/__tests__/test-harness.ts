import { spawnSync } from 'node:child_process';

import { CodexAdapter, type CodexAdapterOptions } from '../codex-adapter.js';
import type { CodexProcessTransport } from '../transport/process.js';
import type { ManagedAgentCommand } from '../../../messages/command.js';
import type { ManagedAgentEvent } from '../../../messages/event.js';
import type { InputItem } from '../../../messages/input.js';
import type { ManagedAgentCommandResult } from '../../../messages/result.js';

type EventType = ManagedAgentEvent['type'];

function ensureOk(
	result: ManagedAgentCommandResult,
	commandType: ManagedAgentCommand['type'],
): void {
	if (result.ok) return;
	throw new Error(
		`${commandType} failed: ${result.error.code} ${result.error.message}`,
	);
}

export function createEventCollector() {
	const events: ManagedAgentEvent[] = [];

	return {
		events,
		onEvent(event: ManagedAgentEvent): void {
			events.push(event);
		},
		waitForEvent(
			type: EventType,
			count = 1,
			timeoutMs = 3000,
		): Promise<ManagedAgentEvent[]> {
			return new Promise((resolve, reject) => {
				const timer = setTimeout(() => {
					reject(
						new Error(
							`Timed out waiting for ${count} "${type}" events (got ${events.filter((event) => event.type === type).length})`,
						),
					);
				}, timeoutMs);

				const check = () => {
					const matches = events.filter((event) => event.type === type);
					if (matches.length >= count) {
						clearTimeout(timer);
						resolve(matches);
						return;
					}

					setTimeout(check, 10);
				};

				check();
			});
		},
	};
}

export function getAdapterThreadId(adapter: CodexAdapter): string | null {
	return (
		(adapter as unknown as { transport: { threadId: string | null } }).transport
			.threadId ?? null
	);
}

export function getProcessTransport(
	adapter: CodexAdapter,
): CodexProcessTransport {
	return (adapter as unknown as { transport: CodexProcessTransport }).transport;
}

export function createCodexAdapterHarness(
	options?: Partial<CodexAdapterOptions>,
) {
	const collector = createEventCollector();
	const adapter = new CodexAdapter({
		onEvent: (event) => collector.onEvent(event),
		...options,
	});

	return {
		adapter,
		events: collector.events,
		waitForEvent: (type: EventType, count?: number, timeoutMs?: number) =>
			collector.waitForEvent(type, count, timeoutMs),
		getThreadId(): string | null {
			return getAdapterThreadId(adapter);
		},
		waitForThreadId(timeoutMs = 3000): Promise<string> {
			return new Promise((resolve, reject) => {
				const timer = setTimeout(
					() => reject(new Error('Timed out waiting for adapter threadId')),
					timeoutMs,
				);

				const check = () => {
					const threadId = getAdapterThreadId(adapter);
					if (threadId) {
						clearTimeout(timer);
						resolve(threadId);
						return;
					}

					setTimeout(check, 10);
				};

				check();
			});
		},
		async dispatch(
			command: ManagedAgentCommand,
		): Promise<ManagedAgentCommandResult> {
			return adapter.dispatch(command);
		},
		async startSession(
			spec: Record<string, unknown> = {},
			_timeoutMs = 3000,
		): Promise<void> {
			const result = await adapter.dispatch({ type: 'session.start', spec });
			ensureOk(result, 'session.start');
		},
		async resumeSession(
			ref: Record<string, unknown> = {},
			_timeoutMs = 3000,
		): Promise<void> {
			const result = await adapter.dispatch({ type: 'session.resume', ref });
			ensureOk(result, 'session.resume');
		},
		async startTurn(input: InputItem[] | string): Promise<void> {
			const normalizedInput: InputItem[] =
				typeof input === 'string'
					? [{ kind: 'user_message', text: input }]
					: input;

			const result = await adapter.dispatch({
				type: 'turn.start',
				input: normalizedInput,
			});
			ensureOk(result, 'turn.start');
		},
		async dispose(): Promise<void> {
			await adapter.dispose();
		},
	};
}

export function createScriptedCodexAdapterHarness(
	script: string,
	options?: Partial<CodexAdapterOptions>,
) {
	return createCodexAdapterHarness({
		transport: {
			command: 'node',
			args: ['-e', script],
		},
		...options,
	});
}

export function getRealCodexIntegrationAvailability(): {
	available: boolean;
	reason: string | null;
} {
	if (process.env.FRANKLIN_RUN_CODEX_INTEGRATION !== '1') {
		return {
			available: false,
			reason: 'Set FRANKLIN_RUN_CODEX_INTEGRATION=1 to run real Codex tests',
		};
	}

	const probe = spawnSync('codex', ['--version'], { stdio: 'ignore' });
	if (probe.status === 0) {
		return { available: true, reason: null };
	}

	return {
		available: false,
		reason: 'codex is not available on PATH',
	};
}
