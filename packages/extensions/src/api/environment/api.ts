import type { Environment } from './types.js';

export interface EnvironmentAPI {
	getEnvironment(): Environment;
}
