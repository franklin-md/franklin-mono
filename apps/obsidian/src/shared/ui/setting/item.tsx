import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function SettingItem({ children }: Props) {
	return <div className="setting-item">{children}</div>;
}
