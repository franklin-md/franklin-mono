import type {
	AuthManager,
	EnvironmentConfig,
	EnvironmentFactory,
} from '@franklin/agent';
import type { MiniACPConnector } from '@franklin/mini-acp';
import type { EvidenceRepository } from '../capture/evidence/types.js';

export type InboxRunnerOptions = {
	connect: MiniACPConnector;
	auth: AuthManager;
	environment: EnvironmentFactory;
	config: EnvironmentConfig;
	vaultName: string;
	evidence?: EvidenceRepository;
};
