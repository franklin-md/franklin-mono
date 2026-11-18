import type {
	AuthManager,
	EnvironmentConfig,
	FranklinApp,
} from '@franklin/agent';

export type InboxRunnerOptions = {
	createAgent: FranklinApp['createAgent'];
	auth: AuthManager;
	config: EnvironmentConfig;
	vaultName: string;
};
