import { useEffect, useState, type DependencyList } from 'react';

/**
 * Run an async function on mount (and when `deps` change) and return
 * its resolved value. The promise is automatically cancelled if the
 * component unmounts or deps change before it settles.
 *
 * @overload With an `initial` value — the return type is always `T`.
 * @overload Without — the return type is `T | undefined` until resolved.
 */
export function useAsync<T>(
	fn: () => Promise<T>,
	initial: T,
	deps: DependencyList,
): T;
export function useAsync<T>(
	fn: () => Promise<T>,
	deps: DependencyList,
): T | undefined;
export function useAsync<T>(
	fn: () => Promise<T>,
	initialOrDeps: T | DependencyList,
	maybeDeps?: DependencyList,
): T | undefined {
	const hasInitial = maybeDeps !== undefined;
	const initial = hasInitial ? (initialOrDeps as T) : undefined;
	const deps = hasInitial ? maybeDeps : (initialOrDeps as DependencyList);

	const [value, setValue] = useState(initial);

	useEffect(() => {
		let cancelled = false;

		void fn().then((result) => {
			if (!cancelled) setValue(result);
		});

		return () => {
			cancelled = true;
		};
	}, deps);

	return value;
}
