import { initOnly } from './init-only.js';
import { simplePrompt } from './simple-prompt.js';
import { reasoningPrompt } from './reasoning-prompt.js';
import { toolCall } from './tool-call.js';

export const allFixtures = [
	initOnly,
	simplePrompt,
	reasoningPrompt,
	toolCall,
] as const;
