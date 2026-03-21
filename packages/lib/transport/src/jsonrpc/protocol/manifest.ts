import type { MethodKind, MethodName, RpcMethods } from './method-types.js';

export type MethodDescriptor<
	TKind extends 'request' | 'notification' | 'event',
> = {
	kind: TKind;
};

export type SideManifest<TMethods extends RpcMethods<TMethods>> = {
	[K in MethodName<TMethods>]: MethodDescriptor<MethodKind<TMethods[K]>>;
};

export type ProtocolManifest<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> = {
	server: SideManifest<TServer>;
	client: SideManifest<TClient>;
};

export function request(): MethodDescriptor<'request'> {
	return { kind: 'request' };
}

export function notification(): MethodDescriptor<'notification'> {
	return { kind: 'notification' };
}

export function event(): MethodDescriptor<'event'> {
	return { kind: 'event' };
}

export function defineManifest<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
>(
	manifest: ProtocolManifest<TServer, TClient>,
): ProtocolManifest<TServer, TClient> {
	return manifest;
}
