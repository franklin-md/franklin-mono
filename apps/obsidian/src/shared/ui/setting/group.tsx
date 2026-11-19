import type { ReactNode } from 'react';

import { SettingHeading } from './heading.js';

type Props = {
	title: ReactNode;
	description?: ReactNode;
	children: ReactNode;
};

// Mirrors Obsidian's SettingGroup DOM (1.11+): items inside `.setting-items`
// share one card with dividers. Loose `.setting-item`s render as separate cards.
// https://docs.obsidian.md/Reference/TypeScript+API/SettingGroup
export function SettingGroup({ title, description, children }: Props) {
	return (
		<div className="setting-group">
			<SettingHeading name={title} description={description} />
			<div className="setting-items">{children}</div>
		</div>
	);
}
