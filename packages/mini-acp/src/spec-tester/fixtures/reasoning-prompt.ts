import type { Fixture } from '../types.js';
import { initialize } from '../actions/initialize.js';
import { setContext } from '../actions/set-context.js';
import { prompt } from '../actions/prompt.js';

export const reasoningPrompt: Fixture = {
	name: 'reasoning-prompt',
	actions: [
		initialize(),
		setContext({
			systemPrompt: 'You are a helpful math tutor. Show your reasoning.',
		}),
		prompt(
			'Think step by step: how do you derive the Pythagorean theorem from first principles?',
		),
	],
};
