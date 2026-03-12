export interface TerminalMode {
	readonly enable: string;
	readonly disable: string;
}

export interface MouseWheelEvent {
	readonly direction: 'up' | 'down';
	readonly x: number;
	readonly y: number;
}

export function alternateScreen(): TerminalMode {
	return {
		// Enter alternate screen buffer, clear screen, move cursor home
		enable: '\x1b[?1049h\x1b[2J\x1b[H',
		// Leave alternate screen buffer (restores original content)
		disable: '\x1b[?1049l',
	};
}

export function mouseTracking(): TerminalMode {
	return {
		// 1000 = button event tracking, 1006 = SGR extended encoding
		enable: '\x1b[?1000h\x1b[?1006h',
		disable: '\x1b[?1006l\x1b[?1000l',
	};
}

export function composeModes(...modes: TerminalMode[]): TerminalMode {
	return {
		enable: modes.map((m) => m.enable).join(''),
		disable: modes
			.toReversed()
			.map((m) => m.disable)
			.join(''),
	};
}

export function applyMode(
	mode: TerminalMode,
	stream: { write(s: string): boolean },
): () => void {
	stream.write(mode.enable);
	return () => stream.write(mode.disable);
}

// Matches CSI sequences with the ESC byte already stripped by Ink's useInput.
// CSI parameter bytes: digits, semicolons, and private-use markers (<, =, >, ?)
const STRIPPED_CSI_RE = /^\[[\d;<=>?]/;

/** Returns true if the string is or starts with an ANSI escape sequence. */
export function isEscapeSequence(data: string): boolean {
	return data.startsWith('\x1b') || STRIPPED_CSI_RE.test(data);
}

// SGR mouse wheel: ESC[<64;x;yM (up) or ESC[<65;x;yM (down)
// Uppercase M = press. Lowercase m = release (ignored for wheel events).
// eslint-disable-next-line no-control-regex
const MOUSE_WHEEL_RE = /\x1b\[<(64|65);(\d+);(\d+)M/g;

export function parseMouseWheelEvents(data: string): MouseWheelEvent[] {
	const events: MouseWheelEvent[] = [];
	for (const match of data.matchAll(MOUSE_WHEEL_RE)) {
		events.push({
			direction: match[1] === '64' ? 'up' : 'down',
			x: Number(match[2]),
			y: Number(match[3]),
		});
	}
	return events;
}
