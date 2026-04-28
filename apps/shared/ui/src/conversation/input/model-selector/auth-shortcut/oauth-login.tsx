import { Loader2, UserRoundPlus } from 'lucide-react';
import { useOAuthLogin } from '@franklin/react';

import { IconButton } from '../../../../components/icon-button.js';

import {
	shortcutButtonClassName,
	shortcutIconClassName,
} from './button-classes.js';

type Props = {
	displayName: string;
	provider: string;
};

export function OAuthLoginAuthAction({ displayName, provider }: Props) {
	const { pending, handleLogin } = useOAuthLogin(provider);
	const label = `Sign in to ${displayName}`;

	return (
		<IconButton
			aria-label={label}
			className={shortcutButtonClassName}
			disabled={pending}
			icon={pending ? Loader2 : UserRoundPlus}
			iconClassName={
				pending
					? `${shortcutIconClassName} animate-spin`
					: shortcutIconClassName
			}
			onClick={() => {
				void handleLogin();
			}}
			title={label}
			type="button"
		/>
	);
}
