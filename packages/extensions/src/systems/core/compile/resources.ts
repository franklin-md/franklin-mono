import {
	createClientConnection,
	CtxTracker,
	type ClientBinding,
} from '@franklin/mini-acp';
import type { SpawnResult } from './compiler.js';

type CoreResources = {
	readonly connection: ClientBinding;
	readonly tracker: CtxTracker;
};

export function createResources(transport: SpawnResult): CoreResources {
	return {
		connection: createClientConnection(transport),
		tracker: new CtxTracker(),
	};
}
