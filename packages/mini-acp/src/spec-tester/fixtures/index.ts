import { initOnly } from './init-only.js';
import { simplePrompt } from './simple-prompt.js';
import { toolCall } from './tool-call.js';

export const allFixtures = [initOnly, simplePrompt, toolCall] as const;
