import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { PortalProvider } from './portal.js';

export type Mounter = {
	mount: (contentEl: HTMLElement, children: ReactNode) => void;
	unmount: () => void;
};

export function createMounter(): Mounter {
	let contentEl: HTMLElement | null = null;
	let root: Root | null = null;

	const unmount = () => {
		const currentContentEl = contentEl;
		if (!currentContentEl) {
			return;
		}

		root?.unmount();
		root = null;
		currentContentEl.style.removeProperty('height');
		currentContentEl.replaceChildren();
		contentEl = null;
	};

	return {
		mount: (nextContentEl, children) => {
			unmount();
			contentEl = nextContentEl;
			nextContentEl.replaceChildren();
			nextContentEl.classList.add('franklin');
			nextContentEl.style.height = '100%';
			root = createRoot(nextContentEl);
			root.render(
				<PortalProvider hostEl={nextContentEl}>{children}</PortalProvider>,
			);
		},
		unmount,
	};
}
