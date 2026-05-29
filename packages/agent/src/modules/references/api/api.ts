import type { BaseRuntime, Signature } from '@franklin/extensibility';
import type { ReferenceHandler, ReferenceHandlerRuntime } from './types.js';

export type ReferencesAPI<Runtime extends ReferenceHandlerRuntime> = {
	registerReferenceHandler(handler: ReferenceHandler<Runtime>): void;
};

export interface ReferencesSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: ReferencesAPI<this['In'] & ReferenceHandlerRuntime>;
}
