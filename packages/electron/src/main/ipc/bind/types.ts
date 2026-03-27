import type { WebContents } from 'electron';

export interface BoundLease {
	readonly value: unknown;
	readonly close: () => Promise<void>;
}

export interface BindingContext {
	readonly webContents: WebContents;
	readonly leases: Map<string, BoundLease>;
	readonly disposables: Set<() => Promise<void>>;
	readonly dispose: () => Promise<void>;
}

export interface MainBindingHandle {
	dispose(): Promise<void>;
}
