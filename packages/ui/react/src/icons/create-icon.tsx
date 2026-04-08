import { memo, useId } from 'react';
import type { NamedExoticComponent, ReactNode } from 'react';

import type { IconProps } from './types.js';

type IconRender = (uid: string) => ReactNode;

export function createIcon(
	displayName: string,
	render: IconRender,
): NamedExoticComponent<IconProps> {
	const Icon = memo<IconProps>(function Icon({ size = '1em', ...props }) {
		const uid = useId();

		return (
			<svg
				height={size}
				viewBox="0 0 24 24"
				width={size}
				xmlns="http://www.w3.org/2000/svg"
				{...props}
			>
				{render(uid)}
			</svg>
		);
	});

	Icon.displayName = displayName;

	return Icon;
}
