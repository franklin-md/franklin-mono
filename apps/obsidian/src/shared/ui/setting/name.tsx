import type { ReactNode } from 'react';

type Props = { children: ReactNode; htmlFor?: string };

export function SettingName({ children, htmlFor }: Props) {
	if (htmlFor === undefined)
		return <div className="setting-item-name">{children}</div>;
	return (
		<label htmlFor={htmlFor} className="setting-item-name block">
			{children}
		</label>
	);
}
