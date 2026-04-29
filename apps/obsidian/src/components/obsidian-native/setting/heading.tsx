import type { ReactNode } from 'react';

type Props = {
	name: ReactNode;
	description?: ReactNode;
};

export function SettingHeading({ name, description }: Props) {
	return (
		<div className="setting-item setting-item-heading">
			<div className="setting-item-info">
				<div className="setting-item-name">{name}</div>
				{description !== undefined && (
					<div className="setting-item-description">{description}</div>
				)}
			</div>
		</div>
	);
}
