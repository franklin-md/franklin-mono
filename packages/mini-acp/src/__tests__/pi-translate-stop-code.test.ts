import { describe, expect, it } from 'vitest';

import type { AgentEvent } from '@earendil-works/pi-agent-core';

import { narrowPiStopCode } from '../backend/pi/translate/error.js';
import { fromAgentEvent } from '../backend/pi/translate/events.js';
import { StopCode } from '../types/stop-code.js';

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
	it('does not forward Pi agent_end as an idle terminal', () => {
		const event: AgentEvent = { type: 'agent_end', messages: [] };
		expect(fromAgentEvent(event, 'msg-1')).toBeNull();
	});
});
