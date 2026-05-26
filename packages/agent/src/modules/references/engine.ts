import type { Reference, ReferenceContext } from './api/types.js';

export type RegisteredReferenceHandler = {
	toContext(reference: Reference): Promise<ReferenceContext>;
};

export type ReferenceRegistry = ReadonlyMap<string, RegisteredReferenceHandler>;

export class ReferencesEngine {
	constructor(private readonly handlers: ReferenceRegistry) {}

	async toContext(reference: Reference): Promise<ReferenceContext> {
		const handler = this.handlers.get(reference.type);
		if (!handler) {
			return referenceUnavailable(
				`No reference handler registered for "${reference.type}"`,
			);
		}

		try {
			return normalizeContext(await handler.toContext(reference));
		} catch (err) {
			return referenceUnavailable(
				`Handler for "${reference.type}" failed: ${errorMessage(err)}`,
			);
		}
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
