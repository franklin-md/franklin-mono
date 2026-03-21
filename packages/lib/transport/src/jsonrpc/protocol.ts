import type { Duplex } from '../streams/types.js';
import type { JsonRpcRequest, JsonRpcResponse } from './types.js';

export type RpcUnaryMethod<TParams = unknown, TResult = void> = (
	params: TParams,
) => Promise<TResult>;

export type RpcStreamMethod<TParams = unknown, TResult = unknown> = (
	params: TParams,
) => AsyncIterable<TResult>;

export type RpcMethod<TParams = unknown, TResult = unknown> =
	| RpcUnaryMethod<TParams, TResult>
	| RpcStreamMethod<TParams, TResult>;

export type RpcMethods<TMethods extends object = object> = {
	[K in keyof TMethods]: RpcMethod<any, any>;
};

// ---------------------------------------------------------------------------
type MethodName<TMethods extends RpcMethods<TMethods>> = Extract<
	keyof TMethods,
	string
>;

export type MethodParams<TMethod extends RpcMethod> = Parameters<TMethod>[0];

export type MethodResult<TMethod extends RpcMethod> =
	ReturnType<TMethod> extends AsyncIterable<infer TItem>
		? TItem
		: Awaited<ReturnType<TMethod>>;

export type MethodIsStream<TMethod extends RpcMethod> =
	ReturnType<TMethod> extends AsyncIterable<unknown> ? true : false;

// ---------------------------------------------------------------------------
// Turns Function Signatures into JSON-RPC Request Messages
export type RequestFor<
	TMethods extends RpcMethods<TMethods>,
	TMethodName extends MethodName<TMethods>,
> = JsonRpcRequest<MethodParams<TMethods[TMethodName]>, TMethodName>;

// Turns Function Signatures into JSON-RPC Response Messages
export type ResponseFor<
	TMethods extends RpcMethods<TMethods>,
	TMethodName extends MethodName<TMethods>,
> = JsonRpcResponse<MethodResult<TMethods[TMethodName]>>;

// All Requests from one side
export type Requests<TMethods extends RpcMethods<TMethods>> = {
	[K in MethodName<TMethods>]: RequestFor<TMethods, K>;
}[MethodName<TMethods>];

// All Responses from one side
export type Responses<TMethods extends RpcMethods<TMethods>> = {
	[K in MethodName<TMethods>]: ResponseFor<TMethods, K>;
}[MethodName<TMethods>];

// ---------------------------------------------------------------------------

export type UpMessages<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> = Requests<TServer> | Responses<TClient>;

export type DownMessages<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> = Requests<TClient> | Responses<TServer>;

export type Protocol<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> = Duplex<UpMessages<TServer, TClient>, DownMessages<TServer, TClient>>;
