import { combine } from './combine.js';
import type {
	BaseRuntimeSystem,
	CombinableSystem,
	CombineSystems,
} from './types.js';

export interface SystemBuilder<Sys extends BaseRuntimeSystem> {
	add<Sys2 extends BaseRuntimeSystem>(
		sys: Sys2 & CombinableSystem<Sys, Sys2>,
	): SystemBuilder<CombineSystems<Sys, Sys2>>;
	done(): Sys;
}

export function systems<Sys extends BaseRuntimeSystem>(
	sys: Sys,
): SystemBuilder<Sys> {
	return {
		add: <Sys2 extends BaseRuntimeSystem>(
			sys2: Sys2 & CombinableSystem<Sys, Sys2>,
		) => systems(combine(sys, sys2)),
		done: () => sys,
	};
}
