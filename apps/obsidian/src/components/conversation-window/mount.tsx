import type { AgentCreateInput, FranklinApp } from '@franklin/agent/browser';
import { PortalContainerProvider } from '@franklin/ui';
import { createRoot } from 'react-dom/client';

import { ConversationWindow } from './window.js';

type MountConversationWindowOptions = {
	app: FranklinApp;
	contentEl: HTMLElement;
	getCreateInput: () => AgentCreateInput;
};

export function mountConversationWindow({
	app,
	contentEl,
	getCreateInput,
}: MountConversationWindowOptions): () => void {
	contentEl.replaceChildren();
	contentEl.classList.add('franklin');
	contentEl.style.height = '100%';

	const root = createRoot(contentEl);
	root.render(
		<PortalContainerProvider value={contentEl}>
			<ConversationWindow app={app} getCreateInput={getCreateInput} />
		</PortalContainerProvider>,
	);

	return () => {
		root.unmount();
		contentEl.style.removeProperty('height');
		contentEl.replaceChildren();
	};
}
