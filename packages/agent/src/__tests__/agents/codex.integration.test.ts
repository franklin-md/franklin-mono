/* eslint-disable vitest/no-standalone-expect */
import { expect } from 'vitest';

import { codexAgentSpec } from '../../agents/index.js';

import { runAgentIntegrationTests } from '../agent-test-runner.js';
import { collectAgentText } from '../helpers.js';

runAgentIntegrationTests({
	agentName: 'codex',
	spec: codexAgentSpec,
	promptText: 'Reply with exactly the single word FRANKLIN.',
	timeoutMs: 30_000,
	async assertRoundTrip({ connection, sessionId, updates }) {
		const firstPromptText = collectAgentText(updates);
		expect(firstPromptText.trim().length).toBeGreaterThan(0);
		expect(firstPromptText).toMatch(/franklin/i);

		const secondPromptStart = updates.length;
		const secondPromptResponse = await connection.commands.prompt({
			sessionId,
			prompt: [
				{
					type: 'text',
					text: 'Reply with exactly the single word AGAIN.',
				},
			],
		});

		expect(secondPromptResponse.stopReason).toBeDefined();

		const secondPromptText = collectAgentText(updates.slice(secondPromptStart));
		expect(secondPromptText.trim().length).toBeGreaterThan(0);
		expect(secondPromptText).toMatch(/again/i);
	},
});
