import type {
	AuthManager,
	EnvironmentConfig,
	FranklinApp,
} from '@franklin/agent';
import type { EvidenceRepository } from '../evidence/types.js';

export type InboxRunnerOptions = {
	createAgent: FranklinApp['createAgent'];
	auth: AuthManager;
	config: EnvironmentConfig;
	vaultName: string;
	evidence?: EvidenceRepository;
};
