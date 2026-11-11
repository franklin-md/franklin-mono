import { PortalContainerProvider } from '@franklin/ui';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

const portalRoots = new WeakMap<Document, HTMLElement>();

function getOrCreatePortalRoot(doc: Document): HTMLElement {
	const existing = portalRoots.get(doc);
	if (existing && existing.isConnected) {
		return existing;
	}

	const element = doc.createElement('div');
	element.classList.add('franklin');
	element.dataset.franklinPortalRoot = 'true';
	doc.body.append(element);
	portalRoots.set(doc, element);
	return element;
}

export function clearPortalRoot(doc: Document): void {
	portalRoots.get(doc)?.remove();
	portalRoots.delete(doc);
}

// Obsidian can move a view's host element into a pop-out window. Track the
// active document so the portal container retargets when that happens —
// otherwise popups (dropdowns, dialogs) get clipped by the original window.
function usePortalRoot(hostEl: HTMLElement): HTMLElement {
	const [doc, setDoc] = useState(hostEl.ownerDocument);
	useEffect(
		() => hostEl.onWindowMigrated((win) => setDoc(win.document)),
		[hostEl],
	);
	return getOrCreatePortalRoot(doc);
}

type PortalProviderProps = {
	hostEl: HTMLElement;
	children: ReactNode;
};

export function PortalProvider({ hostEl, children }: PortalProviderProps) {
	const portalRoot = usePortalRoot(hostEl);
	return (
		<PortalContainerProvider value={portalRoot}>
			{children}
		</PortalContainerProvider>
	);
}
