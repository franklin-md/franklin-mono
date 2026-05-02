import { combine } from './combine.js';
import type { BaseHarnessModule, Modules, ValidateModules } from './types.js';

/**
 * Fold `combine` over a tuple of harness modules. The signature accepts
 * `modules: T & ValidateModules<T>`, which routes each pairwise overlap
 * error onto the offending tuple element rather than the fold call site.
 */
export function combineAll<T extends readonly BaseHarnessModule[]>(
	modules: readonly [...T] & ValidateModules<T>,
): Modules<T> {
	const [head, ...rest] = modules as readonly BaseHarnessModule[];
	if (head === undefined) {
		throw new Error('combineAll requires at least one module');
	}
	let acc: BaseHarnessModule = head;
	for (const next of rest) {
		acc = combine(acc, next as never);
	}
	return acc as Modules<T>;
}
