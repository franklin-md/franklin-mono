import type { ThinkingLevel } from '@franklin/mini-acp';
import type { QuickEditPreset } from './presets/types.js';

export type QuickEditState = {
	path: string;
	line: number;
	selection: string;
	// Preserve pending file-review changes when Escape restores a wrapped selection.
	selectionBaseline?: string;
	prompt: string;
	status: 'ready' | 'running' | 'done' | 'failed' | 'stopped';
	error: string;
};

export type QuickEditSettings = {
	provider: string;
	model: string;
	reasoning: ThinkingLevel;
	instructions: string;
	presets: QuickEditPreset[];
};

export type QuickEditRequest = {
	state: QuickEditState;
	settings: QuickEditSettings;
	signal: AbortSignal;
};

export type QuickEditRunner = (request: QuickEditRequest) => Promise<void>;
