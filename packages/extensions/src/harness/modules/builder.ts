import { combine } from './combine.js';
import type {
	BaseHarnessModule,
	CombinableModule,
	CombineModules,
} from './types.js';

export interface ModuleBuilder<Module extends BaseHarnessModule> {
	add<Sys2 extends BaseHarnessModule>(
		module: Sys2 & CombinableModule<Module, Sys2>,
	): ModuleBuilder<CombineModules<Module, Sys2>>;
	done(): Module;
}

export function modules<Module extends BaseHarnessModule>(
	module: Module,
): ModuleBuilder<Module> {
	return {
		add: <Sys2 extends BaseHarnessModule>(
			module2: Sys2 & CombinableModule<Module, Sys2>,
		) => modules(combine(module, module2)),
		done: () => module,
	};
}
