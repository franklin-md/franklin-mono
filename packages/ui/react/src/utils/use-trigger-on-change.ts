import { useCallback, useEffect, useRef } from 'react';

export interface UseTriggerOnChangeOptions {
	disabled?: boolean;
}

export interface UseTriggerOnChange {
	retrigger: () => void;
}

export function useTriggerOnChange(
	key: unknown,
	trigger: () => void,
	options: UseTriggerOnChangeOptions = {},
): UseTriggerOnChange {
	const hasMountedRef = useRef(false);
	const triggerRef = useRef(trigger);
	const disabledRef = useRef(options.disabled ?? false);

	triggerRef.current = trigger;
	disabledRef.current = options.disabled ?? false;

	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return;
		}

		if (disabledRef.current) {
			return;
		}

		triggerRef.current();
	}, [key]);

	const retrigger = useCallback(() => {
		triggerRef.current();
	}, []);

	return { retrigger };
}
