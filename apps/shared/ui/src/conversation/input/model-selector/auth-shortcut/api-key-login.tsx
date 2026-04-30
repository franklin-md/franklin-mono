import { KeyRound } from 'lucide-react';
import { useAuthActionHandlers } from '@franklin/react';

import { IconButton } from '../../../../components/icon-button.js';

import {
	shortcutButtonClassName,
	shortcutIconClassName,
} from './button-classes.js';

type Props = {
	displayName: string;
	provider: string;
};

export function ApiKeyAuthAction({ displayName, provider }: Props) {
	const { requestApiKey } = useAuthActionHandlers();
	const label = `Add API key for ${displayName}`;

	return (
		<IconButton
			aria-label={label}
			className={shortcutButtonClassName}
			icon={KeyRound}
			iconClassName={shortcutIconClassName}
			onClick={() => {
				void requestApiKey({ provider, displayName });
			}}
			title={label}
			type="button"
		/>
	);
}
