import { CredentialsSettings } from './credentials/index.js';
import { ViewingContextSettings } from './viewing-context.js';

export function SettingsPage() {
	return (
		<>
			<CredentialsSettings />
			<ViewingContextSettings />
		</>
	);
}
