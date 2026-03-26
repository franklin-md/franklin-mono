const leaseRegistry = new WeakMap<
	object,
	{ release: () => Promise<void>; released: boolean }
>();

export function attachLease<T extends object>(
	value: T,
	release: () => Promise<void>,
): T {
	leaseRegistry.set(value, { release, released: false });
	return value;
}

export async function releaseLease(value: unknown): Promise<void> {
	if (!value || typeof value !== 'object') return;

	const lease = leaseRegistry.get(value);
	if (!lease || lease.released) return;

	lease.released = true;
	await lease.release();
}

export function isLeaseReleased(value: unknown): boolean {
	if (!value || typeof value !== 'object') return false;
	return leaseRegistry.get(value)?.released ?? false;
}
