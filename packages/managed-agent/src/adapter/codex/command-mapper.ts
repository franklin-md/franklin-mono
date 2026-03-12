import type { InputItem } from '../../messages/input.js';
import type {
	CodexUserInput,
	InitializeParams,
	ThreadForkParams,
	ThreadResumeParams,
	ThreadStartParams,
	TurnInterruptParams,
	TurnStartParams,
} from './types.js';

// ---------------------------------------------------------------------------
// Stateless mappers: Franklin commands → Codex request params.
// ---------------------------------------------------------------------------

const CLIENT_INFO = { name: 'franklin', version: '0.0.0' } as const;
const THREAD_HISTORY_OPTIONS = {
	experimentalRawEvents: false,
	persistExtendedHistory: false,
} as const;
const RESUME_HISTORY_OPTIONS = {
	persistExtendedHistory: false,
} as const;

function makeInitializeParams(): InitializeParams {
	return { clientInfo: CLIENT_INFO };
}

function mapInputToUserInput(items: InputItem[]): CodexUserInput[] {
	return items.map((item) => ({
		type: 'text' as const,
		text: item.text,
		text_elements: [],
	}));
}

// -- Session ----------------------------------------------------------------

export function mapSessionStart(): {
	initializeParams: InitializeParams;
	threadStartParams: ThreadStartParams;
} {
	return {
		initializeParams: makeInitializeParams(),
		threadStartParams: { ...THREAD_HISTORY_OPTIONS },
	};
}

export function mapSessionResume(threadId: string): {
	initializeParams: InitializeParams;
	threadResumeParams: ThreadResumeParams;
} {
	return {
		initializeParams: makeInitializeParams(),
		threadResumeParams: { threadId, ...RESUME_HISTORY_OPTIONS },
	};
}

export function mapSessionFork(threadId: string): {
	initializeParams: InitializeParams;
	threadForkParams: ThreadForkParams;
} {
	return {
		initializeParams: makeInitializeParams(),
		threadForkParams: { threadId, ...RESUME_HISTORY_OPTIONS },
	};
}

// -- Turn -------------------------------------------------------------------

export function mapTurnStart(
	input: InputItem[],
	threadId: string,
): TurnStartParams {
	return {
		threadId,
		input: mapInputToUserInput(input),
	};
}

export function mapTurnInterrupt(
	threadId: string,
	turnId: string,
): TurnInterruptParams {
	return { threadId, turnId };
}
