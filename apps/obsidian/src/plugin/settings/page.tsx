import { useState, useSyncExternalStore, type ReactNode } from 'react';
import type { ReadonlyStore } from '@franklin/agent';
import { AuthActionProvider } from '@franklin/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@franklin/ui';

import { ChatSettings } from '../../apps/chat/settings/page.js';
import type { InboxController } from '../../apps/inbox/controller/index.js';
import { InboxSettings } from '../../apps/inbox/settings/page.js';
import { QuickEditSettingsPanel } from '../../apps/quick-edit/settings/page.js';
import type { QuickEditPreferences } from '../../apps/quick-edit/settings/store.js';
import type { SettingsSection } from '../../shared/obsidian/settings/types.js';
import { SettingGroup } from '../../shared/ui/setting/group.js';
import { CredentialsSettings } from './credentials/index.js';

type Props = {
	inbox: ReadonlyStore<{ controller: InboxController | null }>;
	onConfigureInboxShortcut?: () => void;
	quickEdit: ReadonlyStore<{ preferences: QuickEditPreferences | null }>;
	onConfigureQuickEditShortcut?: () => void;
	initialSection?: SettingsSection;
	onSectionChange?: (section: SettingsSection) => void;
};

export function SettingsPage({
	inbox,
	onConfigureInboxShortcut,
	quickEdit,
	onConfigureQuickEditShortcut,
	initialSection = 'general',
	onSectionChange,
}: Props) {
	const [section, setSection] = useState(initialSection);
	const inboxController = useSyncExternalStore(
		(notify) => inbox.subscribe(notify),
		() => inbox.get().controller,
	);
	const quickEditPreferences = useSyncExternalStore(
		(notify) => quickEdit.subscribe(notify),
		() => quickEdit.get().preferences,
	);
	const panels = {
		general: { label: 'General', content: <ChatSettings /> },
		inbox: {
			label: 'Inbox',
			content: inboxController && (
				<InboxSettings
					inbox={inboxController}
					onConfigureInboxShortcut={onConfigureInboxShortcut}
				/>
			),
		},
		'quick-edit': {
			label: 'Quick edit',
			content: quickEditPreferences && (
				<AuthActionProvider
					handlers={{ requestApiKey: () => handleSectionChange('connections') }}
				>
					<QuickEditSettingsPanel
						preferences={quickEditPreferences}
						active={section === 'quick-edit'}
						onConfigureShortcut={onConfigureQuickEditShortcut}
					/>
				</AuthActionProvider>
			),
		},
		connections: {
			label: 'Connections',
			content: (
				<SettingGroup title="Credentials">
					<CredentialsSettings />
				</SettingGroup>
			),
		},
	} satisfies Record<SettingsSection, { label: string; content: ReactNode }>;

	function handleSectionChange(value: string) {
		if (
			value !== 'general' &&
			value !== 'connections' &&
			value !== 'inbox' &&
			value !== 'quick-edit'
		)
			return;
		setSection(value);
		onSectionChange?.(value);
	}

	return (
		<Tabs
			value={section}
			onValueChange={handleSectionChange}
			className="min-w-0"
		>
			<div className="sticky top-0 z-10 overflow-x-auto bg-[var(--background-primary)] py-2">
				<TabsList
					aria-label="Franklin settings"
					className="w-max min-w-full justify-start"
				>
					{Object.entries(panels).map(([id, panel]) => (
						<TabsTrigger key={id} value={id}>
							{panel.label}
						</TabsTrigger>
					))}
				</TabsList>
			</div>
			{/* Keep OAuth state while switching tabs. Hidden panels remain mounted
			    but leave the tab order and accessibility tree.
			    https://www.radix-ui.com/primitives/docs/components/tabs#content */}
			{Object.entries(panels).map(([id, panel]) => (
				<TabsContent
					key={id}
					value={id}
					forceMount
					hidden={section !== id}
					className="min-w-0"
				>
					{panel.content}
				</TabsContent>
			))}
		</Tabs>
	);
}
