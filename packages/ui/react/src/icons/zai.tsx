import { memo } from 'react';

import type { IconProps } from './types.js';

export const ZAI = memo<IconProps>(function ZAI({ size = '1em', ...props }) {
	return (
		<svg
			height={size}
			viewBox="0 0 24 24"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M12.105 2 9.927 4.953H.653L2.83 2h9.276ZM23.254 19.048 21.078 22h-9.242l2.174-2.952h9.244ZM24 2 9.264 22H0L14.736 2H24Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	);
});
