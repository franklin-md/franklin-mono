import type { ReactNode } from 'react';

import { SettingHeading } from './heading.js';

type Props = {
	title: ReactNode;
	description?: ReactNode;
	children: ReactNode;
};

export function SettingGroup({ title, description, children }: Props) {
	return (
		<>
			<SettingHeading name={title} description={description} />
			{children}
		</>
	);
}
