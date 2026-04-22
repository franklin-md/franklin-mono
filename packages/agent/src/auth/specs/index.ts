import { anthropicSpec } from './anthropic.js';
import { openaiCodexSpec } from './openai-codex.js';
import type { AuthorizationCodePkceSpec } from './types.js';

export const BUILT_IN_SPECS: AuthorizationCodePkceSpec[] = [
	anthropicSpec,
	openaiCodexSpec,
];
