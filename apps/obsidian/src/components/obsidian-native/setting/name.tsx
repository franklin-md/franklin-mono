import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function SettingName({ children }: Props) {
	return <div className="setting-item-name">{children}</div>;
}
