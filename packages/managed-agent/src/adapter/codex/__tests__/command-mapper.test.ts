import { describe, expect, it } from 'vitest';

import {
	mapSessionFork,
	mapSessionResume,
	mapSessionStart,
	mapTurnInterrupt,
	mapTurnStart,
} from '../command-mapper.js';

describe('mapSessionStart', () => {
	it('returns initialize and threadStart params', () => {
		const result = mapSessionStart();
		expect(result.initializeParams).toEqual({
			clientInfo: { name: 'franklin', version: '0.0.0' },
			capabilities: { experimentalApi: true },
		});
		expect(result.threadStartParams).toEqual({
			experimentalRawEvents: true,
			persistExtendedHistory: false,
		});
	});
});

describe('mapSessionResume', () => {
	it('returns initialize and threadResume params with threadId', () => {
		const result = mapSessionResume('thread-abc');
		expect(result.initializeParams.clientInfo.name).toBe('franklin');
		expect(result.threadResumeParams).toEqual({
			threadId: 'thread-abc',
			persistExtendedHistory: false,
		});
	});
});

describe('mapSessionFork', () => {
	it('returns initialize and threadFork params with threadId', () => {
		const result = mapSessionFork('thread-xyz');
		expect(result.initializeParams.clientInfo.name).toBe('franklin');
		expect(result.threadForkParams).toEqual({
			threadId: 'thread-xyz',
			persistExtendedHistory: false,
		});
	});
});

describe('mapTurnStart', () => {
	it('maps InputItem[] to Codex TurnStartParams', () => {
		const result = mapTurnStart(
			[{ kind: 'user_message', text: 'hello' }],
			'thread-1',
		);
		expect(result).toEqual({
			threadId: 'thread-1',
			input: [{ type: 'text', text: 'hello', text_elements: [] }],
		});
	});

	it('handles multiple input items', () => {
		const result = mapTurnStart(
			[
				{ kind: 'user_message', text: 'first' },
				{ kind: 'user_message', text: 'second' },
			],
			'thread-2',
		);
		expect(result.input).toHaveLength(2);
		expect(result.input[0]!.text).toBe('first');
		expect(result.input[1]!.text).toBe('second');
	});

	it('handles empty input', () => {
		const result = mapTurnStart([], 'thread-3');
		expect(result.input).toEqual([]);
	});
});

describe('mapTurnInterrupt', () => {
	it('maps threadId and turnId to TurnInterruptParams', () => {
		const result = mapTurnInterrupt('thread-1', 'turn-5');
		expect(result).toEqual({ threadId: 'thread-1', turnId: 'turn-5' });
	});
});
