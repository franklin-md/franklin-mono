import type { BaseRuntime } from '@franklin/extensions';
import type {
	Reference,
	ReferenceContext,
	ReferenceEngine,
} from './api/index.js';

type BoundReferenceHandler = {
	toContext(reference: Reference): Promise<ReferenceContext>;
};

export type ReferencesRuntime = BaseRuntime & {
	readonly references: ReferenceEngine;
};

type CreateReferencesRuntimeInput = {
	readonly handlers: ReadonlyMap<string, BoundReferenceHandler>;
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
		subscribe(): () => void {
			return () => {};
		},
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
