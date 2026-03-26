import type { Multiplexer } from '@franklin/transport';

export interface BoundLease {
	readonly value: unknown;
	readonly close: () => Promise<void>;
}

export interface BoundWindow {
	readonly impl: unknown;
	readonly rootMux: Multiplexer<unknown, unknown>;
	readonly leases: Map<string, BoundLease>;
	readonly dispose: () => Promise<void>;
}

export interface MainBindingHandle {
	dispose(): Promise<void>;
}
