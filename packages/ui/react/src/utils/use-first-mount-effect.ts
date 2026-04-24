import { useEffect, useRef } from 'react';

export function useFirstMountEffect(effect: () => void): void {
	const effectRef = useRef(effect);
	effectRef.current = effect;

	useEffect(() => {
		effectRef.current();
	}, []);
}
