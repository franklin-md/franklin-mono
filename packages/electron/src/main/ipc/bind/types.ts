import type { Duplex, Multiplexer } from '@franklin/transport';

export interface BoundWindow {
	readonly impl: unknown;
	readonly rootMux: Multiplexer<unknown, unknown>;
	readonly tunnels: Map<string, Duplex<unknown, unknown>>;
	readonly dispose: () => Promise<void>;
}

export interface MainBindingHandle {
	dispose(): Promise<void>;
}
