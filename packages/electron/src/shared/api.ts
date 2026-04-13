export type IpcStreamMessage<T = unknown> =
	| { kind: 'data'; data: T }
	| { kind: 'close' };

export function isIpcStreamMessage(value: unknown): value is IpcStreamMessage {
	if (typeof value !== 'object' || value == null) {
		return false;
	}

	const kind = (value as { kind?: unknown }).kind;
	return kind === 'data' || kind === 'close';
}

export interface FranklinIpcRuntime {
	invoke(channel: string, ...args: unknown[]): Promise<unknown>;
	send(channel: string, packet: unknown): void;
	subscribe(channel: string, listener: (packet: unknown) => void): () => void;
}
