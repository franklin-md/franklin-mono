import { describe, expect, it } from 'vitest';

import type { AgentEvent } from '@mariozechner/pi-agent-core';

import { narrowPiStopCode } from '../base/pi/translate/error.js';
import { fromAgentEvent } from '../base/pi/translate/events.js';
import { StopCode } from '../types/stop-code.js';

const emptyUsage = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		total: 0,
	},
};

describe('narrowPiStopCode', () => {
	it('maps 401 invalid key errors to AuthKeyInvalid', () => {
		expect(
			narrowPiStopCode(
				'error',
				'401 Incorrect API key provided: sk-inval**-key.',
			),
		).toBe(StopCode.AuthKeyInvalid);
	});

	it('maps missing key errors to AuthKeyNotSpecified', () => {
		expect(
			narrowPiStopCode(
				'error',
				'OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass it as an argument.',
			),
		).toBe(StopCode.AuthKeyNotSpecified);
	});

	it('maps other HTTP errors to ProviderError', () => {
		expect(
			narrowPiStopCode('error', '429 Rate limit exceeded for requests'),
		).toBe(StopCode.ProviderError);
	});

	it('falls back to LlmError for unclassified provider errors', () => {
		expect(narrowPiStopCode('error', 'socket hang up')).toBe(StopCode.LlmError);
	});
});

describe('fromAgentEvent', () => {
	it('maps agent_end auth failures to turnEnd with AuthKeyInvalid', () => {
		const errorMessage =
			'401 Incorrect API key provided: sk-inval**-key. You can find your API key at https://platform.openai.com/account/api-keys.';

		const event: AgentEvent = {
			type: 'agent_end',
			messages: [
				{
					role: 'assistant',
					content: [],
					api: 'openai-responses',
					provider: 'openai',
					model: 'gpt-4.1-mini',
					usage: emptyUsage,
					stopReason: 'error',
					errorMessage,
					timestamp: Date.now(),
				},
			],
		};

		expect(fromAgentEvent(event, 'msg-1')).toEqual({
			type: 'turnEnd',
			stopCode: StopCode.AuthKeyInvalid,
			stopMessage: errorMessage,
			usage: {
				tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			},
		});
	});

	it('propagates real pi-ai usage values onto the turnEnd event', () => {
		const usage = {
			input: 120,
			output: 45,
			cacheRead: 80,
			cacheWrite: 10,
			totalTokens: 255,
			cost: {
				input: 0.00036,
				output: 0.000675,
				cacheRead: 0.00002,
				cacheWrite: 0.0000375,
				total: 0.0010925,
			},
		};

		const event: AgentEvent = {
			type: 'agent_end',
			messages: [
				{
					role: 'assistant',
					content: [],
					api: 'anthropic-messages',
					provider: 'anthropic',
					model: 'claude-sonnet-4-6',
					usage,
					stopReason: 'stop',
					timestamp: Date.now(),
				},
			],
		};

		expect(fromAgentEvent(event, 'msg-2')).toEqual({
			type: 'turnEnd',
			stopCode: StopCode.Finished,
			stopMessage: undefined,
			usage: {
				tokens: {
					input: 120,
					output: 45,
					cacheRead: 80,
					cacheWrite: 10,
					total: 255,
				},
				cost: usage.cost,
			},
		});
	});
});
