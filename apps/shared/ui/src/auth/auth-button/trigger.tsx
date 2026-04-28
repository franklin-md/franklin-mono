import { useAuthEntries } from '@franklin/react';

import { Dialog, DialogTrigger } from '../../primitives/dialog.js';
import { AuthModalContent } from '../settings-page/modal.js';
import { apiKeyPanel, oauthPanel } from '../settings-page/panels.js';

import { AuthButton } from './button.js';

export function AuthSettingsTrigger() {
	const { providerCount } = useAuthEntries();

	return (
		<Dialog>
			<DialogTrigger asChild>
				<AuthButton providerCount={providerCount} />
			</DialogTrigger>

			<AuthModalContent panels={[oauthPanel, apiKeyPanel]} />
		</Dialog>
	);
}
