import type { FranklinApp } from '@franklin/agent/browser';
import type { FranklinSystem } from '@franklin/agent/browser';
import type { SessionCreateInput } from '@franklin/extensions';
import { PortalContainerProvider } from '@franklin/ui';
import { createRoot } from 'react-dom/client';

import { ConversationWindow } from './window.js';

type MountConversationWindowOptions = {
	app: FranklinApp;
	contentEl: HTMLElement;
	getCreateAgentOverrides: () => NonNullable<
		SessionCreateInput<FranklinSystem>['overrides']
	>;
};

export function mountConversationWindow({
	app,
	contentEl,
	getCreateAgentOverrides,
}: MountConversationWindowOptions): () => void {
	contentEl.replaceChildren();
	contentEl.classList.add('franklin');
	contentEl.style.height = '100%';

	const root = createRoot(contentEl);
	root.render(
		<PortalContainerProvider value={contentEl}>
			<ConversationWindow
				app={app}
				getCreateAgentOverrides={getCreateAgentOverrides}
			/>
		</PortalContainerProvider>,
	);

	return () => {
		root.unmount();
		contentEl.style.removeProperty('height');
		contentEl.replaceChildren();
	};
}
