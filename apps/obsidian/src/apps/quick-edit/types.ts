import type { ThinkingLevel } from '@franklin/mini-acp';

export type QuickEditState = {
	path: string;
	line: number;
	selection: string;
	prompt: string;
	status: 'ready' | 'running' | 'done' | 'failed' | 'stopped';
	error: string;
};

export type QuickEditSettings = {
	provider: string;
	model: string;
	reasoning: ThinkingLevel;
	instructions: string;
};

export type QuickEditRequest = {
	state: QuickEditState;
	settings: QuickEditSettings;
	signal: AbortSignal;
};

export type QuickEditRunner = (request: QuickEditRequest) => Promise<void>;
