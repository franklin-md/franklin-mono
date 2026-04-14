import type { ComponentType } from 'react';

import type { AuthEntries } from '@franklin/agent/browser';

/** Props passed to every auth panel by the modal shell. */
export type AuthPanelProps = {
	savedEntries: AuthEntries;
	onUpdate: () => Promise<void>;
};

/** Descriptor that plugs a panel into `AuthModalContent`. */
export type AuthPanelDescriptor = {
	/** Unique key used as the tab value (e.g. `"oauth"`, `"apiKeys"`). */
	id: string;
	/** Human-readable tab label. */
	label: string;
	/** The panel component to render. */
	component: ComponentType<AuthPanelProps>;
};
