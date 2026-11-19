import type { EnvironmentConfig, FranklinApp } from '@franklin/agent';

export type InboxRunnerOptions = {
	createAgent: FranklinApp['createAgent'];
	config: EnvironmentConfig;
	vaultName: string;
};
