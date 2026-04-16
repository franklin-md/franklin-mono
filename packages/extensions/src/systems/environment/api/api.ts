import type { ReconfigurableEnvironment } from './types.js';

export interface EnvironmentAPI {
	getEnvironment(): ReconfigurableEnvironment;
}
