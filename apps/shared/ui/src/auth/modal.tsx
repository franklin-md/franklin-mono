import { useCallback, useEffect, useState } from 'react';

import type { AuthEntries } from '@franklin/agent/browser';

import {
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '../primitives/dialog.js';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '../primitives/tabs.js';

import { useAuthManager } from './context.js';
import type { AuthPanelDescriptor } from './types.js';

/**
 * Config-driven auth dialog content.
 *
 * - One panel  → rendered directly (no tabs).
 * - Two+ panels → rendered as tabs; all stay force-mounted so an in-progress
 *   OAuth flow is never lost when switching tabs.
 */
export function AuthModalContent({
	panels,
	onEntriesChange,
}: {
	panels: AuthPanelDescriptor[];
	onEntriesChange?: (entries: AuthEntries) => void;
}) {
	const auth = useAuthManager();
	const [savedEntries, setSavedEntries] = useState<AuthEntries>({});

	useEffect(() => {
		const entries = auth.entries();
		setSavedEntries(entries);
		onEntriesChange?.(entries);
	}, [auth, onEntriesChange]);

	const handleUpdate = useCallback(async () => {
		const entries = auth.entries();
		setSavedEntries(entries);
		onEntriesChange?.(entries);
	}, [auth, onEntriesChange]);

	return (
		<DialogContent className="w-[500px]">
			<DialogHeader>
				<DialogTitle>Authentication</DialogTitle>
			</DialogHeader>

			{panels.length === 1 && panels[0] ? (
				<SinglePanel
					panel={panels[0]}
					savedEntries={savedEntries}
					onUpdate={handleUpdate}
				/>
			) : (
				<TabbedPanels
					panels={panels}
					savedEntries={savedEntries}
					onUpdate={handleUpdate}
				/>
			)}
		</DialogContent>
	);
}

// ---------------------------------------------------------------------------

function SinglePanel({
	panel,
	savedEntries,
	onUpdate,
}: {
	panel: AuthPanelDescriptor;
	savedEntries: AuthEntries;
	onUpdate: () => Promise<void>;
}) {
	const Component = panel.component;
	return <Component savedEntries={savedEntries} onUpdate={onUpdate} />;
}

function TabbedPanels({
	panels,
	savedEntries,
	onUpdate,
}: {
	panels: AuthPanelDescriptor[];
	savedEntries: AuthEntries;
	onUpdate: () => Promise<void>;
}) {
	return (
		<Tabs defaultValue={panels[0]?.id}>
			<TabsList className="w-full">
				{panels.map((panel) => (
					<TabsTrigger key={panel.id} value={panel.id} className="flex-1">
						{panel.label}
					</TabsTrigger>
				))}
			</TabsList>

			{panels.map((panel) => {
				const Component = panel.component;
				return (
					<TabsContent
						key={panel.id}
						value={panel.id}
						forceMount
						className="data-[state=inactive]:hidden"
					>
						<Component savedEntries={savedEntries} onUpdate={onUpdate} />
					</TabsContent>
				);
			})}
		</Tabs>
	);
}
