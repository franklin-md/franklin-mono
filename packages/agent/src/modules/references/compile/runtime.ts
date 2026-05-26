import type { Reference, ReferenceContext } from '../api/index.js';
import type { ReferenceRegistry, ReferencesRuntime } from './types.js';

type CreateReferencesRuntimeInput = {
	readonly handlers: ReferenceRegistry;
};

export function createReferencesRuntime({
	handlers,
}: CreateReferencesRuntimeInput): ReferencesRuntime {
	const toContext = async (reference: Reference): Promise<ReferenceContext> => {
		const handler = handlers.get(reference.type);
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
	};

	return {
		references: { toContext },
		async dispose(): Promise<void> {},
	};
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
