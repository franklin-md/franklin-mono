import {
	createDependencyModule,
	type DependencyModule,
	type InferSignature,
} from '@franklin/extensibility/module';
import type {
	StateExtensionModule,
	StateHandle,
} from '../../../state/index.js';
import type {
	Details,
	DetailsRuntime,
	DetailsState,
	RuntimeVisibility,
} from './types.js';

type DetailsDependencyModule = DependencyModule<'details', Details>;

export type DetailsModule = StateExtensionModule<
	DetailsState,
	InferSignature<DetailsDependencyModule>,
	DetailsRuntime
>;

const DEFAULT_VISIBILITY: RuntimeVisibility = 'visible';

function createDetailsState(
	visibility: RuntimeVisibility = DEFAULT_VISIBILITY,
): DetailsState {
	return {
		details: { visibility },
	};
}

function detailsStateFromRuntime(runtime: DetailsRuntime): DetailsState {
	return createDetailsState(runtime.details.visibility);
}

function createDetailsStateHandle(
	runtime: DetailsRuntime,
): StateHandle<DetailsState> {
	return {
		get: async () => detailsStateFromRuntime(runtime),
		fork: async () => detailsStateFromRuntime(runtime),
		child: async () => detailsStateFromRuntime(runtime),
	};
}

export function createDetailsModule(id: string): DetailsModule {
	return {
		emptyState: () => createDetailsState(),
		state: (runtime) => createDetailsStateHandle(runtime),
		instantiate(state) {
			return createDependencyModule('details', {
				id,
				visibility: state.details.visibility,
			});
		},
	};
}
