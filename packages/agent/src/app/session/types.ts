import type { SessionSnapshot } from '../../modules/core/state.js';
import type { EnvironmentConfig } from '../../modules/environment/api/index.js';
import type { DetailsState } from '../../modules/orchestrator/internal/details/index.js';
import type { StoreMapping } from '../../modules/store/api/index.js';

/** Explicit app-level shape persisted under `{appDir}/sessions/{id}.json`. */
export type FranklinSession = DetailsState & {
	core: SessionSnapshot;
	store: StoreMapping;
	env: EnvironmentConfig;
};
