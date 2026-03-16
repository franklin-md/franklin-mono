import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
	Client,
	PromptResponse,
	SessionNotification,
} from '@agentclientprotocol/sdk';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';

import type { AgentConnection } from '../../connection.js';
import { createAgentConnection } from '../../connection.js';
import type { AgentSpec } from '../../registry.js';
import type { AgentEvents } from '../../types.js';
import { fillHandler } from '../../spawn.js';
import { StdioTransport } from '../../transport/index.js';

import { collectAgentText, createMockClient } from './helpers.js';

export interface AgentIntegrationTestOptions {
	agentName: string;
	spec?: AgentSpec;
	createConnection?: (handler: AgentEvents) => AgentConnection;
	cwd?: string;
	promptText?: string;
	timeoutMs?: number;
	integrationEnvVar?: string;
	isAvailable?: () => boolean;
	expectSessionUpdates?: boolean;
	assertRoundTrip?: (
		context: AgentPromptRoundTripContext,
	) => Promise<void> | void;
}

export interface AgentPromptRoundTripContext {
	connection: AgentConnection;
	sessionId: string;
	promptText: string;
	promptResponse: PromptResponse;
	updates: SessionNotification[];
	handler: Client;
}

function isCommandAvailable(command: string): boolean {
	const locator = process.platform === 'win32' ? 'where' : 'which';
	return spawnSync(locator, [command], { stdio: 'ignore' }).status === 0;
}

function createConnectionFactory(
	options: AgentIntegrationTestOptions,
): (handler: AgentEvents) => AgentConnection {
	if (options.createConnection) return options.createConnection;
	const { spec } = options;
	if (!spec) {
		throw new Error(
			'runAgentIntegrationTests requires either createConnection or spec',
		);
	}

	return (handler: AgentEvents) =>
		createAgentConnection(new StdioTransport(spec), handler);
}

export function runAgentIntegrationTests(
	options: AgentIntegrationTestOptions,
): void {
	const available =
		options.isAvailable ??
		(() => (options.spec ? isCommandAvailable(options.spec.command) : true));
	const shouldRun = available();
	const describeIntegration = shouldRun ? describe : describe.skip;
	const buildConnection = createConnectionFactory(options);

	describeIntegration(
		`AgentConnection integration (${options.agentName})`,
		() => {
			const connections: AgentConnection[] = [];

			afterEach(async () => {
				while (connections.length > 0) {
					const conn = connections.pop();
					if (conn) await conn.dispose();
				}
			});

			async function initializeConnection(client?: Client) {
				const handler = fillHandler(client ?? createMockClient());
				const connection = buildConnection(handler);
				connections.push(connection);

				const initializeResponse = await connection.commands.initialize({
					protocolVersion: PROTOCOL_VERSION,
					clientCapabilities: {},
				});

				return { connection, initializeResponse };
			}

			async function createSession(client?: Client) {
				const { connection, initializeResponse } =
					await initializeConnection(client);
				const sessionResponse = await connection.commands.newSession({
					cwd: options.cwd ?? process.cwd(),
					mcpServers: [],
				});

				return { connection, initializeResponse, sessionResponse };
			}

			it(
				'initializes with the negotiated ACP protocol version',
				async () => {
					const { initializeResponse } = await initializeConnection();

					expect(initializeResponse.protocolVersion).toBe(PROTOCOL_VERSION);
				},
				options.timeoutMs ?? 120_000,
			);

			it(
				'creates a real session',
				async () => {
					const { sessionResponse } = await createSession();

					expect(sessionResponse.sessionId).toBeDefined();
				},
				options.timeoutMs ?? 120_000,
			);

			it(
				'completes a prompt round-trip with the real agent',
				async () => {
					const updates: SessionNotification[] = [];
					const handler = createMockClient({
						sessionUpdate: vi.fn(async (payload: SessionNotification) => {
							updates.push(payload);
						}),
					});
					const { connection, sessionResponse } = await createSession(handler);
					const promptText = options.promptText ?? 'say hello';

					const promptResponse = await connection.commands.prompt({
						sessionId: sessionResponse.sessionId,
						prompt: [
							{
								type: 'text',
								text: promptText,
							},
						],
					});

					expect(promptResponse.stopReason).toBeDefined();

					if (options.expectSessionUpdates ?? true) {
						// eslint-disable-next-line @typescript-eslint/unbound-method
						expect(handler.sessionUpdate).toHaveBeenCalled();
						expect(updates.length).toBeGreaterThan(0);
					}

					if (options.assertRoundTrip) {
						await options.assertRoundTrip({
							connection,
							sessionId: sessionResponse.sessionId,
							promptText,
							promptResponse,
							updates,
							handler,
						});
					} else {
						// Default: verify the agent produced non-empty text containing "hello"
						const responseText = collectAgentText(updates);
						expect(responseText.trim().length).toBeGreaterThan(0);
						expect(responseText).toMatch(/hello/i);
					}
				},
				options.timeoutMs ?? 120_000,
			);
		},
	);
}
