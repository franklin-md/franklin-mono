import { useState, type ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@franklin/ui';
import type { SettingsSection } from '../../shared/obsidian/settings/types.js';
import { CaptureSettings } from '../../apps/inbox/capture/settings.js';
import type { MCPConnections } from '@franklin/extension-mcp';
import { ConnectionSettings } from './connections/settings.js';
import { SettingGroup } from '../../shared/ui/setting/group.js';
import { CredentialsSettings } from './credentials/index.js';
import type { InboxController } from '../../apps/inbox/controller/controller.js';
import { InboxSettings } from '../../apps/inbox/settings/page.js';
import { ChatSettings } from '../../apps/chat/settings/page.js';
import { DocumentDownloadSettings } from './document-downloads.js';
import type { QuickEditPreferences } from '../../apps/quick-edit/settings/store.js';
import { QuickEditSettingsPanel } from '../../apps/quick-edit/settings/page.js';

type Props = {
	initialSection?: SettingsSection;
	onSectionChange?: (section: SettingsSection) => void;
	onConfigureInboxShortcut?: () => void;
	inbox?: InboxController;
	connections?: MCPConnections;
	quickEdit?: QuickEditPreferences;
	onConfigureQuickEditShortcut?: () => void;
};

export function SettingsPage({
	initialSection = 'general',
	onSectionChange,
	onConfigureInboxShortcut,
	inbox,
	connections,
	quickEdit,
	onConfigureQuickEditShortcut,
}: Props) {
	const [section, setSection] = useState(initialSection);
	const panels = {
		general: {
			label: 'General',
			content: (
				<>
					<ChatSettings />
					{quickEdit && (
						<QuickEditSettingsPanel
							preferences={quickEdit}
							onConfigureShortcut={onConfigureQuickEditShortcut ?? (() => {})}
						/>
					)}
					<SettingGroup title="Document downloads">
						<DocumentDownloadSettings />
					</SettingGroup>
				</>
			),
		},
		inbox: {
			label: 'Inbox',
			content: (
				<InboxSettings
					inbox={inbox}
					onConfigureInboxShortcut={onConfigureInboxShortcut}
				/>
			),
		},
		flashcards: {
			label: 'Flashcards',
			content: inbox?.capture ? (
				<SettingGroup title="Capture">
					<CaptureSettings controller={inbox.capture} />
				</SettingGroup>
			) : (
				<p className="py-4 text-sm text-muted-foreground">
					Flashcard capture is unavailable.
				</p>
			),
		},
		connections: {
			label: 'Connections',
			content: (
				<>
					<SettingGroup title="Accounts">
						<CredentialsSettings />
					</SettingGroup>
					{connections && (
						<SettingGroup title="Research tools">
							<ConnectionSettings connections={connections} />
						</SettingGroup>
					)}
				</>
			),
		},
	} satisfies Record<SettingsSection, { label: string; content: ReactNode }>;
	return (
		<Tabs
			value={section}
			onValueChange={(value) => {
				if (!(value in panels)) return;
				const next = value as SettingsSection;
				setSection(next);
				onSectionChange?.(next);
			}}
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
			{/* Radix normally unmounts inactive panels. Keep drafts alive and explicitly
			    hide forced panels so their controls leave the tab order and accessibility tree.
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
