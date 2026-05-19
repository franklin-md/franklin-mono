import { useCallback, useEffect, useState } from 'react';

export type UseObservedState<T> = {
	readonly value: T;
	readonly set: (next: T) => Promise<void>;
};

type Subscribe = (listener: () => void) => () => void;
type Read<Value> = () => Promise<Value>;
type Apply<Value> = (value: Value) => Promise<void>;

export function useObservedState<Value>(
	subscribe: Subscribe,
	read: Read<Value>,
	apply: Apply<Value>,
	initial: Value,
): UseObservedState<Value> {
	const [value, setValue] = useState(initial);

	useEffect(() => {
		let active = true;

		const sync = async () => {
			try {
				const next = await read();
				if (active) setValue(next);
			} catch {
				// Keep current value on failure.
			}
		};

		void sync();
		const unsubscribe = subscribe(() => {
			void sync();
		});

		return () => {
			active = false;
			unsubscribe();
		};
	}, [subscribe, read]);

	// This hook does not optimistically update local state. `set` writes to the
	// external source, and React state catches up through the observer/read path.
	const set = useCallback(
		(next: Value): Promise<void> => {
			return apply(next);
		},
		[apply],
	);

	return { value, set };
}
