import type { AgentStopCode } from '@franklin/agent';
import type { ModelSelection } from '../../shared/model/selection.js';
import type { PromptPreset } from '../../shared/preset/types.js';

export type QuickEditState = {
	path: string;
	line: number;
	selection: string;
	// Preserve pending file-review changes when Escape restores a wrapped selection.
	selectionBaseline?: string;
	prompt: string;
	status: 'ready' | 'running' | 'done' | 'failed' | 'stopped';
	error: string;
	// Present when a model turn or credential check ended the edit.
	stopCode?: AgentStopCode;
};

export type QuickEditSettings = ModelSelection & {
	instructions: string;
	presets: PromptPreset[];
};

export type QuickEditRequest = {
	directive: string;
	state: QuickEditState;
	settings: QuickEditSettings;
	signal: AbortSignal;
};

export type QuickEditRunner = (request: QuickEditRequest) => Promise<void>;
