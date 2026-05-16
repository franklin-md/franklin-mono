import type { Fold, FoldRight } from '@franklin/lib';
import type { ComposeSignature, Signature, StaticSignature } from './types.js';

interface ComposeSignatureFold extends Fold {
	readonly In: readonly [Signature, Signature];
	readonly Out: ComposeSignature<this['In'][0], this['In'][1]>;
}

export type ReduceSignatures<Signatures extends readonly Signature[]> =
	FoldRight<
		Signatures,
		StaticSignature<Record<never, never>>,
		ComposeSignatureFold
	>;
