import type React from 'react';
import { useCallback } from 'react';

export function useMergeRefs<T>(
	refs: ReadonlyArray<React.Ref<T> | undefined>,
): React.RefCallback<T> {
	return useCallback(
		(node: T | null) => {
			for (const ref of refs) {
				if (typeof ref === 'function') ref(node);
				else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
			}
		},
		// Depend on individual refs, not the array identity
		refs,
	);
}
