/**
 * Append the eventual composed runtime to an existing callback signature.
 *
 * Signatures use this for registration methods whose callbacks should run
 * later with the fully materialized runtime, while author code can still
 * omit the trailing parameter when it does not need runtime access.
 */
export type WithRuntime<Callback extends (...args: any[]) => any, Runtime> = (
	...args: [...Parameters<Callback>, Runtime]
) => ReturnType<Callback>;

export function bindWithRuntime<
	Callback extends (...args: any[]) => any,
	Runtime,
>(raw: WithRuntime<Callback, Runtime>, getRuntime: () => Runtime): Callback {
	return ((...args: Parameters<Callback>) =>
		raw(...args, getRuntime())) as Callback;
}

export function bindAllWithRuntime<
	Callback extends (...args: any[]) => any,
	Runtime,
>(
	raws: readonly WithRuntime<Callback, Runtime>[],
	getRuntime: () => Runtime,
): Callback[] {
	return raws.map((raw) => bindWithRuntime(raw, getRuntime));
}
