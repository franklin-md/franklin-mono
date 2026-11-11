import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function SettingInfo({ children }: Props) {
	return <div className="setting-item-info">{children}</div>;
}
