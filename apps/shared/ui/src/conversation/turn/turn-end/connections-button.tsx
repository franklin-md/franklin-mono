import { KeyRound } from 'lucide-react';
import { useAuthActionHandlers } from '@franklin/react';

import { Button } from '../../../primitives/button.js';

// Opens the host's credential surface; the turn end does not name a provider.
export function ConnectionsButton() {
	const { requestApiKey } = useAuthActionHandlers();
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="gap-1.5"
			onClick={() => void requestApiKey()}
		>
			<KeyRound className="size-3.5" aria-hidden="true" />
			Open connections
		</Button>
	);
}
