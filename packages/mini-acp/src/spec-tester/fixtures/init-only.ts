import type { Fixture } from '../types.js';
import { initialize } from '../actions/initialize.js';

export const initOnly: Fixture = {
	name: 'init-only',
	actions: [initialize()],
};
