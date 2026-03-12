import { describe, expect, it, vi } from 'vitest';

import {
	alternateScreen,
	applyMode,
	composeModes,
	isEscapeSequence,
	mouseTracking,
	parseMouseWheelEvents,
} from '../lib/terminal-modes.js';

describe('alternateScreen', () => {
	it('enables alternate screen buffer with clear and cursor home', () => {
		const mode = alternateScreen();
		expect(mode.enable).toBe('\x1b[?1049h\x1b[2J\x1b[H');
	});

	it('disables alternate screen buffer', () => {
		const mode = alternateScreen();
		expect(mode.disable).toBe('\x1b[?1049l');
	});
});

describe('mouseTracking', () => {
	it('enables button event tracking and SGR encoding', () => {
		const mode = mouseTracking();
		expect(mode.enable).toBe('\x1b[?1000h\x1b[?1006h');
	});

	it('disables in reverse order', () => {
		const mode = mouseTracking();
		expect(mode.disable).toBe('\x1b[?1006l\x1b[?1000l');
	});
});

describe('composeModes', () => {
	it('concatenates enable sequences in order', () => {
		const a = { enable: 'A_ON', disable: 'A_OFF' };
		const b = { enable: 'B_ON', disable: 'B_OFF' };
		const composed = composeModes(a, b);
		expect(composed.enable).toBe('A_ONB_ON');
	});

	it('concatenates disable sequences in reverse order', () => {
		const a = { enable: 'A_ON', disable: 'A_OFF' };
		const b = { enable: 'B_ON', disable: 'B_OFF' };
		const composed = composeModes(a, b);
		expect(composed.disable).toBe('B_OFFA_OFF');
	});

	it('handles a single mode', () => {
		const a = { enable: 'ON', disable: 'OFF' };
		const composed = composeModes(a);
		expect(composed.enable).toBe('ON');
		expect(composed.disable).toBe('OFF');
	});

	it('returns empty strings for no modes', () => {
		const composed = composeModes();
		expect(composed.enable).toBe('');
		expect(composed.disable).toBe('');
	});

	it('composes three modes correctly', () => {
		const a = { enable: '1', disable: 'A' };
		const b = { enable: '2', disable: 'B' };
		const c = { enable: '3', disable: 'C' };
		const composed = composeModes(a, b, c);
		expect(composed.enable).toBe('123');
		expect(composed.disable).toBe('CBA');
	});
});

describe('applyMode', () => {
	it('writes enable sequence to stream', () => {
		const stream = { write: vi.fn(() => true) };
		const mode = { enable: 'ON', disable: 'OFF' };
		applyMode(mode, stream);
		expect(stream.write).toHaveBeenCalledWith('ON');
	});

	it('returns a cleanup that writes disable sequence', () => {
		const stream = { write: vi.fn(() => true) };
		const mode = { enable: 'ON', disable: 'OFF' };
		const cleanup = applyMode(mode, stream);
		cleanup();
		expect(stream.write).toHaveBeenCalledWith('OFF');
	});
});

describe('isEscapeSequence', () => {
	it('returns true for ESC-prefixed strings', () => {
		expect(isEscapeSequence('\x1b[<64;10;20M')).toBe(true);
	});

	it('returns true for bare ESC character', () => {
		expect(isEscapeSequence('\x1b')).toBe(true);
	});

	it('returns false for normal text', () => {
		expect(isEscapeSequence('hello')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isEscapeSequence('')).toBe(false);
	});

	it('returns true for CSI sequences', () => {
		expect(isEscapeSequence('\x1b[A')).toBe(true);
	});

	it('returns true for OSC sequences', () => {
		expect(isEscapeSequence('\x1b]0;title\x07')).toBe(true);
	});

	// Ink's useInput strips the leading ESC byte, so SGR mouse sequences
	// arrive as "[<64;10;20M" instead of "\x1b[<64;10;20M"
	it('returns true for SGR mouse sequences with ESC stripped', () => {
		expect(isEscapeSequence('[<64;10;20M')).toBe(true);
		expect(isEscapeSequence('[<65;49;5M')).toBe(true);
		expect(isEscapeSequence('[<0;51;4M')).toBe(true);
		expect(isEscapeSequence('[<0;51;4m')).toBe(true);
	});

	it('returns true for CSI private-mode sequences with ESC stripped', () => {
		expect(isEscapeSequence('[?1049h')).toBe(true);
		expect(isEscapeSequence('[=1h')).toBe(true);
	});

	it('returns false for text starting with open bracket', () => {
		expect(isEscapeSequence('[hello]')).toBe(false);
		expect(isEscapeSequence('[')).toBe(false);
	});
});

describe('parseMouseWheelEvents', () => {
	it('parses a single wheel-up event', () => {
		const events = parseMouseWheelEvents('\x1b[<64;10;20M');
		expect(events).toEqual([{ direction: 'up', x: 10, y: 20 }]);
	});

	it('parses a single wheel-down event', () => {
		const events = parseMouseWheelEvents('\x1b[<65;15;30M');
		expect(events).toEqual([{ direction: 'down', x: 15, y: 30 }]);
	});

	it('parses multiple events in a single chunk', () => {
		const data = '\x1b[<64;1;1M\x1b[<64;1;1M\x1b[<65;2;3M';
		const events = parseMouseWheelEvents(data);
		expect(events).toEqual([
			{ direction: 'up', x: 1, y: 1 },
			{ direction: 'up', x: 1, y: 1 },
			{ direction: 'down', x: 2, y: 3 },
		]);
	});

	it('returns empty array for non-mouse data', () => {
		expect(parseMouseWheelEvents('hello')).toEqual([]);
	});

	it('returns empty array for empty string', () => {
		expect(parseMouseWheelEvents('')).toEqual([]);
	});

	it('ignores button press events (not wheel)', () => {
		// button 0 = left click
		expect(parseMouseWheelEvents('\x1b[<0;10;20M')).toEqual([]);
	});

	it('ignores release events (lowercase m)', () => {
		// Wheel events terminated by lowercase m are releases — ignore
		expect(parseMouseWheelEvents('\x1b[<64;10;20m')).toEqual([]);
	});

	it('extracts wheel events mixed with other data', () => {
		const data = 'junk\x1b[<64;5;5Mmore\x1b[<0;1;1Mjunk\x1b[<65;9;9M';
		const events = parseMouseWheelEvents(data);
		expect(events).toEqual([
			{ direction: 'up', x: 5, y: 5 },
			{ direction: 'down', x: 9, y: 9 },
		]);
	});
});
