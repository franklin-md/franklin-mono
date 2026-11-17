import { useState, type ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@franklin/ui';

import { ChatSettings } from '../../apps/chat/settings/page.js';
import type { SettingsSection } from '../../shared/obsidian/settings/types.js';
import { SettingGroup } from '../../shared/ui/setting/group.js';
import { CredentialsSettings } from './credentials/index.js';

type Props = {
	initialSection?: SettingsSection;
	onSectionChange?: (section: SettingsSection) => void;
};

export function SettingsPage({
	initialSection = 'general',
	onSectionChange,
}: Props) {
	const [section, setSection] = useState(initialSection);
	const panels = {
		general: { label: 'General', content: <ChatSettings /> },
		connections: {
			label: 'Connections',
			content: (
				<SettingGroup title="Credentials">
					<CredentialsSettings />
				</SettingGroup>
			),
		},
	} satisfies Record<SettingsSection, { label: string; content: ReactNode }>;

	return (
		<Tabs
			value={section}
			onValueChange={(value) => {
				if (value !== 'general' && value !== 'connections') return;
				setSection(value);
				onSectionChange?.(value);
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
