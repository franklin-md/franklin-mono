import type {
	AuthManager,
	EnvironmentConfig,
	FranklinApp,
	HTTPReferenceCache,
} from '@franklin/agent';
import type { EvidenceRepository } from '../capture/evidence/types.js';

export type InboxRunnerOptions = {
	createAgent: FranklinApp['createAgent'];
	auth: AuthManager;
	config: EnvironmentConfig;
	vaultName: string;
	evidence?: EvidenceRepository;
	referenceCache?: HTTPReferenceCache;
};
