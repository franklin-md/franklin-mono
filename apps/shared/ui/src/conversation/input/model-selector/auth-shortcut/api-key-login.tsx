import { KeyRound } from 'lucide-react';

import { AuthModalContent } from '../../../../auth/settings-page/modal.js';
import { apiKeyPanel } from '../../../../auth/settings-page/panels.js';
import { IconButton } from '../../../../components/icon-button.js';
import { Dialog, DialogTrigger } from '../../../../primitives/dialog.js';

import {
	shortcutButtonClassName,
	shortcutIconClassName,
} from './button-classes.js';

type Props = {
	displayName: string;
};

export function ApiKeyAuthAction({ displayName }: Props) {
	const label = `Add API key for ${displayName}`;

	return (
		<Dialog>
			<DialogTrigger asChild>
				<IconButton
					aria-label={label}
					className={shortcutButtonClassName}
					icon={KeyRound}
					iconClassName={shortcutIconClassName}
					title={label}
					type="button"
				/>
			</DialogTrigger>

			<AuthModalContent panels={[apiKeyPanel]} />
		</Dialog>
	);
}
