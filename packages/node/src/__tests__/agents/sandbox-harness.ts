import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { vi } from 'vitest';

import type {
	ClientCapabilities,
	RequestPermissionRequest,
	SessionNotification,
} from '@agentclientprotocol/sdk';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';

import type { AgentConnection, AgentEvents, AgentSpec } from '@franklin/agent';
import { createAgentConnection, StdioTransport } from '@franklin/agent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SandboxTestOptions {
	/** Agent spec to spawn. */
	spec: AgentSpec;
	/** Prompt text to send to the agent. */
	prompt: string;
	/** Timeout for the prompt round-trip (default: 60s). */
	timeoutMs?: number;
	/** Client capabilities to advertise during initialization. */
	clientCapabilities?: ClientCapabilities;
}

/** A captured ACP event with its method name and params. */
export interface CapturedEvent {
	method: string;
	params: unknown;
}

export interface SandboxTestResult {
	/** All requestPermission events the agent sent. */
	permissions: RequestPermissionRequest[];
	/** All sessionUpdate notifications. */
	updates: SessionNotification[];
	/** All other events (writeTextFile, createTerminal, etc.) for debugging. */
	otherEvents: CapturedEvent[];
	/** The temp directory used as cwd (already cleaned up). */
	cwd: string;
}

// ---------------------------------------------------------------------------
// Event handler that captures permissions and auto-rejects them
// ---------------------------------------------------------------------------

const EVENT_METHODS = [
	'sessionUpdate',
	'requestPermission',
	'readTextFile',
	'writeTextFile',
	'createTerminal',
	'terminalOutput',
	'releaseTerminal',
	'waitForTerminalExit',
	'killTerminal',
] as const;

function buildCapturingHandler(
	permissions: RequestPermissionRequest[],
	updates: SessionNotification[],
	otherEvents: CapturedEvent[],
): AgentEvents {
	const result: Record<string, unknown> = {};

	// Default: capture all events instead of throwing methodNotFound.
	// This prevents the agent from bailing when it uses writeTextFile,
	// createTerminal, etc.
	for (const method of EVENT_METHODS) {
		result[method] = (params: unknown) => {
			otherEvents.push({ method, params });
			return Promise.resolve({});
		};
	}

	// Capture session updates
	result['sessionUpdate'] = vi.fn(async (payload: SessionNotification) => {
		updates.push(payload);
	});

	// Capture permission requests and auto-reject
	result['requestPermission'] = vi.fn(async (req: RequestPermissionRequest) => {
		permissions.push(req);

		// Find the reject_once option to auto-reject safely
		const rejectOption = req.options.find((o) => o.kind === 'reject_once');
		if (rejectOption) {
			return {
				outcome: {
					outcome: 'selected' as const,
					optionId: rejectOption.optionId,
				},
			};
		}

		// Fallback: cancel the permission request
		return { outcome: { outcome: 'cancelled' as const } };
	});

	return result as unknown as AgentEvents;
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

export function isCodexAvailable(): boolean {
	// codex-acp is invoked via npx, so check if the package is resolvable
	return (
		spawnSync('npx', ['@zed-industries/codex-acp', '--help'], {
			stdio: 'ignore',
			timeout: 15_000,
		}).status === 0
	);
}

/**
 * Runs a single sandbox test:
 * 1. Creates a temp dir
 * 2. Spawns the agent with the given spec
 * 3. Initializes + creates session in the temp dir
 * 4. Sends the prompt
 * 5. Captures all requestPermission events (auto-rejects them)
 * 6. Disposes and cleans up
 *
 * Returns the captured permissions and session updates.
 */
export async function runSandboxTest(
	options: SandboxTestOptions,
): Promise<SandboxTestResult> {
	const { spec, prompt, timeoutMs: _timeoutMs, clientCapabilities } = options;

	// 1. Safe temp dir
	const cwd = await mkdtemp(join(tmpdir(), 'franklin-sandbox-'));

	const permissions: RequestPermissionRequest[] = [];
	const updates: SessionNotification[] = [];
	const otherEvents: CapturedEvent[] = [];
	let connection: AgentConnection | undefined;

	try {
		// 2. Spawn agent
		const handler = buildCapturingHandler(permissions, updates, otherEvents);
		connection = createAgentConnection(new StdioTransport(spec), handler);

		// 3. Initialize + session
		await connection.commands.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: clientCapabilities ?? {},
		});

		const { sessionId } = await connection.commands.newSession({
			cwd,
			mcpServers: [],
		});

		// 4. Send prompt
		await connection.commands.prompt({
			sessionId,
			prompt: [{ type: 'text', text: prompt }],
		});
	} finally {
		// 5. Cleanup
		if (connection) {
			await connection.dispose();
		}
		await rm(cwd, { recursive: true, force: true });
	}

	return { permissions, updates, otherEvents, cwd };
}
