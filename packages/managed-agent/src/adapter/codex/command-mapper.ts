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
		threadStartParams: {},
	};
}

export function mapSessionResume(threadId: string): {
	initializeParams: InitializeParams;
	threadResumeParams: ThreadResumeParams;
} {
	return {
		initializeParams: makeInitializeParams(),
		threadResumeParams: { threadId },
	};
}

export function mapSessionFork(threadId: string): {
	initializeParams: InitializeParams;
	threadForkParams: ThreadForkParams;
} {
	return {
		initializeParams: makeInitializeParams(),
		threadForkParams: { threadId },
	};
}

// -- Turn -------------------------------------------------------------------

export function mapTurnStart(
	input: InputItem[],
	threadId: string,
): TurnStartParams {
	return {
		threadId,
		userInput: mapInputToUserInput(input),
	};
}

export function mapTurnInterrupt(
	threadId: string,
	turnId: string,
): TurnInterruptParams {
	return { threadId, turnId };
}
