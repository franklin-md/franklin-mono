import type { Fixture } from '../types.js';
import { initialize } from '../actions/initialize.js';
import { setContext } from '../actions/set-context.js';
import { prompt } from '../actions/prompt.js';

export const simplePrompt: Fixture = {
	name: 'simple-prompt',
	actions: [initialize(), setContext(), prompt('Hello')],
};
