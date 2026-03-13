import { execSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';

import { AgentConnection } from '../connection.js';
import { StdioTransport } from '../transport.js';

import { createMockClient } from './helpers.js';

function isCodexAvailable(): boolean {
	try {
		execSync('which codex', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

const codexAvailable = isCodexAvailable();
const integrationEnabled = !!process.env['FRANKLIN_RUN_CODEX_INTEGRATION'];
const shouldRun = codexAvailable && integrationEnabled;
const describeIntegration = shouldRun ? describe : describe.skip;

describeIntegration('AgentConnection integration (codex)', () => {
	const connections: AgentConnection[] = [];

	afterEach(async () => {
		while (connections.length > 0) {
			const conn = connections.pop();
			if (conn) await conn.dispose();
		}
	});

	it('initialize → newSession → prompt round-trip with real agent', async () => {
		const updates: unknown[] = [];
		const handler = createMockClient({
			sessionUpdate: vi.fn(async (p) => {
				updates.push(p);
			}),
		});

		const transport = new StdioTransport({
			command: 'codex',
			args: ['--acp'],
		});
		const conn = new AgentConnection(transport, handler);
		connections.push(conn);

		const initResp = await conn.initialize({
			protocolVersion: PROTOCOL_VERSION,
			clientCapabilities: {},
		});
		expect(initResp.protocolVersion).toBeDefined();

		const sessionResp = await conn.newSession({
			cwd: process.cwd(),
			mcpServers: [],
		});
		expect(sessionResp.sessionId).toBeDefined();

		const promptResp = await conn.prompt({
			sessionId: sessionResp.sessionId,
			prompt: [{ type: 'text', text: 'say hello' }],
		});
		expect(promptResp.stopReason).toBeDefined();

		// The agent should have sent at least one sessionUpdate during the prompt
		expect(handler.sessionUpdate).toHaveBeenCalled();
	}, 120_000);
});
