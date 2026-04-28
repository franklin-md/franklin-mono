import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function SettingControl({ children }: Props) {
	return <div className="setting-item-control">{children}</div>;
}
