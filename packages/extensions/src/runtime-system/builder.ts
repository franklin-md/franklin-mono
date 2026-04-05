import { combine } from './combine.js';
import type { CombineSystems, RuntimeSystem } from './types.js';

export interface SystemBuilder<Sys extends RuntimeSystem<any, any, any>> {
	add<Sys2 extends RuntimeSystem<any, any, any>>(
		sys: Sys2,
	): SystemBuilder<CombineSystems<Sys, Sys2>>;
	done(): Sys;
}

export function systems<Sys extends RuntimeSystem<any, any, any>>(
	sys: Sys,
): SystemBuilder<Sys> {
	return {
		add: <Sys2 extends RuntimeSystem<any, any, any>>(sys2: Sys2) =>
			systems(combine(sys, sys2)) as unknown as SystemBuilder<
				CombineSystems<Sys, Sys2>
			>,
		done: () => sys,
	};
}
