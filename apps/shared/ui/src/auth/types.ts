import type { ComponentType } from 'react';

export type AuthPanelProps = Record<string, never>;

/** Descriptor that plugs a panel into `AuthModalContent`. */
export type AuthPanelDescriptor = {
	/** Unique key used as the tab value (e.g. `"oauth"`, `"apiKeys"`). */
	id: string;
	/** Human-readable tab label. */
	label: string;
	/** The panel component to render. */
	component: ComponentType<AuthPanelProps>;
};
