import type {
	Reference,
	ReferenceContext,
	ReferenceDelegate,
	ResolvedReference,
} from './api/types.js';

export type RegisteredReferenceHandler = {
	test(reference: ResolvedReference): boolean;
	toContext(
		reference: ResolvedReference,
		delegate: ReferenceDelegate,
	): Promise<ReferenceContext>;
};

export type ReferenceRegistry = readonly RegisteredReferenceHandler[];

export class ReferencesEngine {
	constructor(private readonly handlers: ReferenceRegistry) {}

	async toContext(reference: Reference): Promise<ReferenceContext> {
		return this.resolve(reference, 0);
	}

	private async resolve(
		reference: ResolvedReference,
		startIndex: number,
	): Promise<ReferenceContext> {
		for (let index = startIndex; index < this.handlers.length; index += 1) {
			const handler = this.handlers[index];
			if (!handler) continue;
			let matches: boolean;
			try {
				matches = handler.test(reference);
			} catch (err) {
				return referenceUnavailable(
					`Reference handler test for "${reference.type}" failed: ${errorMessage(err)}`,
				);
			}
			if (!matches) continue;

			try {
				return normalizeContext(
					await handler.toContext(reference, (nextReference) =>
						this.resolve(nextReference, index + 1),
					),
				);
			} catch (err) {
				return referenceUnavailable(
					`Reference handler for "${reference.type}" failed: ${errorMessage(err)}`,
				);
			}
		}

		return referenceUnavailable(
			`No reference handler matched "${reference.type}"`,
		);
	}
}

function normalizeContext(context: ReferenceContext): ReferenceContext {
	return {
		content: context.content,
	};
}

function referenceUnavailable(message: string): ReferenceContext {
	return {
		content: [{ type: 'text', text: `Reference unavailable: ${message}` }],
	};
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}
