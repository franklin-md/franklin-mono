import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function SettingDescription({ children }: Props) {
	return <div className="setting-item-description">{children}</div>;
}
