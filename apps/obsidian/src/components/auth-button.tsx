import { useEffect, useState } from 'react';

import type { AuthEntries } from '@franklin/agent/browser';
import {
	AuthModalContent,
	Button,
	Dialog,
	DialogTrigger,
	apiKeyPanel,
	useAuthManager,
} from '@franklin/ui';

function countApiKeys(entries: AuthEntries): number {
	return Object.values(entries).filter((entry) => Boolean(entry.apiKey)).length;
}

export function AuthButton() {
	const auth = useAuthManager();
	const [keyCount, setKeyCount] = useState(() => countApiKeys(auth.entries()));

	useEffect(() => {
		setKeyCount(countApiKeys(auth.entries()));
	}, [auth]);

	function handleEntriesChange(entries: AuthEntries) {
		setKeyCount(countApiKeys(entries));
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="rounded-full">
					{keyCount > 0
						? `${keyCount} API key${keyCount === 1 ? '' : 's'}`
						: 'API Keys'}
				</Button>
			</DialogTrigger>

			<AuthModalContent
				panels={[apiKeyPanel]}
				onEntriesChange={handleEntriesChange}
			/>
		</Dialog>
	);
}
