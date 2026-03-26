import type { WebContents } from 'electron';

import { createChannels } from '../../../shared/channels.js';
import { createMainIpcMux } from '../stream.js';
import type { BoundLease, BoundWindow } from './types.js';

export function getValueAtPath(target: unknown, path: string[]): unknown {
	let current = target as Record<string, unknown>;
	for (let i = 0; i < path.length; i++) {
		const key = path[i]!;
		if (current == null || typeof current !== 'object') {
			throw new Error(
				`getValueAtPath: nothing at "${key}" (full path: ${path.join('.')})`,
			);
		}
		current = current[key] as Record<string, unknown>;
	}
	return current;
}

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
	binding: BoundWindow,
	id: string,
): BoundLease | undefined {
	return binding.leases.get(id);
}

export async function closeLease(
	binding: BoundWindow,
	id: string,
): Promise<void> {
	const lease = binding.leases.get(id);
	if (!lease) return;

	binding.leases.delete(id);
	await lease.close();
}

export function createBoundWindow(
	name: string,
	webContents: WebContents,
	impl: unknown,
): BoundWindow {
	const channels = createChannels(name);
	const rootMux = createMainIpcMux<unknown, unknown>(
		webContents,
		channels.getIpcStreamChannel(),
	);
	const leases = new Map<string, BoundLease>();
	const binding: BoundWindow = {
		impl,
		rootMux,
		leases,
		dispose: async () => {
			const leaseIds = [...leases.keys()];
			await Promise.allSettled(leaseIds.map((id) => closeLease(binding, id)));

			await rootMux.close();
		},
	};

	return binding;
}
