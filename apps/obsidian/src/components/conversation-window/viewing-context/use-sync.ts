import { useEffect } from 'react';

import type { FranklinRuntime } from '@franklin/agent';
import { viewingContextExtension } from '@franklin/agent';
import { useAgent, useHarness } from '@franklin/react';

import { useObsidianApp } from '../../obsidian-app-context.js';
import { syncWorkspaceViewingContext } from './sync-workspace.js';

const initializedAgents = new WeakSet<FranklinRuntime>();

export function useObsidianViewingContextSync(): void {
	const agent = useAgent();
	const app = useObsidianApp();
	const { settings } = useHarness();
	const viewingContext = agent.getStore(
		viewingContextExtension.keys.viewingContext,
	);

	useEffect(() => {
		if (initializedAgents.has(agent)) return;
		initializedAgents.add(agent);

		viewingContext.set((draft) => {
			draft.enabled = settings.get().shareViewedReferencesByDefault;
		});
	}, [agent, settings, viewingContext]);

	useEffect(() => {
		const sync = syncWorkspaceViewingContext({
			workspace: app.workspace,
			viewingContext,
		});

		return sync.dispose;
	}, [app.workspace, viewingContext]);
}
