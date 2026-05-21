import { ZERO_USAGE } from '@franklin/mini-acp';
import { describe, expect, it } from 'vitest';
import { createRuntimeAgentState } from '../create.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../compile/decorators/__tests__/registry.js';
import type { SessionSnapshot } from '../../state.js';

const runtime = createTestRuntime();

function emptySnapshot(): SessionSnapshot {
	return {
		messages: [],
		llmConfig: {},
		usage: ZERO_USAGE,
	};
}

describe('createRuntimeAgentState', () => {
	it('creates a system prompt builder from registered handlers', async () => {
		const agentState = createRuntimeAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('system');
				});
			}),
			getRuntime: () => runtime,
		});

		expect(await agentState.systemPrompt.build()).toEqual({
			systemPrompt: 'system',
			changed: true,
		});

		agentState.apply({ systemPrompt: 'system' });

		expect(await agentState.systemPrompt.build()).toEqual({
			systemPrompt: 'system',
			changed: false,
		});
	});

	it('does not treat absent handlers as a request to clear a sent prompt', async () => {
		const agentState = createRuntimeAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry(),
			getRuntime: () => runtime,
		});
		agentState.apply({ systemPrompt: 'external' });

		expect(await agentState.systemPrompt.build()).toEqual({
			systemPrompt: '',
			changed: false,
		});
	});

	it('keeps reporting changed until the tracked context changes', async () => {
		const agentState = createRuntimeAgentState({
			snapshot: emptySnapshot(),
			registrations: createCoreRegistry((api) => {
				api.on('systemPrompt', (systemPrompt) => {
					systemPrompt.setPart('retryable');
				});
			}),
			getRuntime: () => runtime,
		});

		expect(await agentState.systemPrompt.build()).toEqual({
			systemPrompt: 'retryable',
			changed: true,
		});
		expect(await agentState.systemPrompt.build()).toEqual({
			systemPrompt: 'retryable',
			changed: true,
		});
	});
});
