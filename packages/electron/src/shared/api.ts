import type {
	Descriptor,
	MethodDescriptor,
	NamespaceDescriptor,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	StreamDescriptor,
} from '@franklin/lib/proxy';

export interface IpcStreamObserver<T = unknown> {
	next: (packet: T) => void;
	close: () => void;
}

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

export interface PreloadStreamBridge<TRead = unknown, TWrite = TRead> {
	subscribe: (observer: IpcStreamObserver<TRead>) => () => void;
	send: (packet: TWrite) => void;
	close: () => Promise<void>;
}

/**
 * Uniform resource bridge shape. Resources always expose:
 * - `connect` / `kill` for lifecycle
 * - `inner(id)` returning a sub-bridge with the SAME recursive shape
 *
 * No `proxy` vs `stream` distinction — the sub-bridge returned by `inner`
 * uses the same type algebra as the top-level bridge.
 */
export interface PreloadResourceBridge<
	TArgs extends unknown[] = unknown[],
	TInner extends ResourceInnerDescriptor = ResourceInnerDescriptor,
> {
	connect: (...args: TArgs) => Promise<string>;
	kill: (id: string) => Promise<void>;
	inner: (id: string) => PreloadBridgeOf<TInner>;
}

export type PreloadBridgeOf<D extends Descriptor> =
	D extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: D extends StreamDescriptor<infer TRead, infer TWrite>
			? PreloadStreamBridge<TRead, TWrite>
			: D extends ResourceDescriptor<infer TArgs, infer TInner>
				? PreloadResourceBridge<TArgs, TInner>
				: D extends NamespaceDescriptor<any, infer TShape>
					? { [K in keyof TShape]: PreloadBridgeOf<TShape[K]> }
					: never;
