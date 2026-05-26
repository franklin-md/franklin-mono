import type { BaseRuntime } from '@franklin/extensibility';
import type { ReferencesEngine } from '../engine.js';

export type ReferencesRuntime = BaseRuntime & {
	readonly references: ReferencesEngine;
};
