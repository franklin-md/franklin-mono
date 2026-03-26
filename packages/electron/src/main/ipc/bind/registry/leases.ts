import type { BindingContext, BoundLease } from '../types.js';

function createLeaseRelease(value: unknown): () => Promise<void> {
	const maybeDisposable = value as {
		dispose?: () => Promise<void> | void;
		close?: () => Promise<void> | void;
	};

	if (typeof maybeDisposable.dispose === 'function') {
		return async () => {
			await maybeDisposable.dispose?.();
		};
	}

	if (typeof maybeDisposable.close === 'function') {
		return async () => {
			await maybeDisposable.close?.();
		};
	}

	return async () => {};
}

export function createBoundLease(
	value: unknown,
	close: () => Promise<void> = createLeaseRelease(value),
): BoundLease {
	return {
		value,
		close,
	};
}

export function getBoundLease(
	context: BindingContext,
	id: string,
): BoundLease | undefined {
	return context.leases.get(id);
}

export async function closeLease(
	context: BindingContext,
	id: string,
): Promise<void> {
	const lease = context.leases.get(id);
	if (!lease) return;

	context.leases.delete(id);
	await lease.close();
}
