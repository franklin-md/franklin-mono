import type { Duplex } from '../../streams/types.js';
import type {
	JsonRpcNotification,
	JsonRpcRequest,
	JsonRpcResponse,
	JsonRpcStreamCancelNotification,
	JsonRpcStreamUpdateNotification,
} from '../types.js';
import type {
	EventMethodNames,
	MethodName,
	MethodParams,
	MethodResult,
	NotificationMethodNames,
	RequestMethodNames,
	RpcMethods,
} from './method-types.js';

export type RequestFor<
	TMethods extends RpcMethods<TMethods>,
	TMethodName extends RequestMethodNames<TMethods>,
> = JsonRpcRequest<MethodParams<TMethods[TMethodName]>, TMethodName>;

export type NotificationFor<
	TMethods extends RpcMethods<TMethods>,
	TMethodName extends NotificationMethodNames<TMethods>,
> = JsonRpcNotification<MethodParams<TMethods[TMethodName]>, TMethodName>;

export type StreamRequestFor<
	TMethods extends RpcMethods<TMethods>,
	TMethodName extends EventMethodNames<TMethods>,
> = JsonRpcRequest<MethodParams<TMethods[TMethodName]>, TMethodName>;

export type ResponseFor<
	TMethods extends RpcMethods<TMethods>,
	TMethodName extends RequestMethodNames<TMethods>,
> = JsonRpcResponse<MethodResult<TMethods[TMethodName]>>;

export type Requests<TMethods extends RpcMethods<TMethods>> = {
	[K in RequestMethodNames<TMethods>]: RequestFor<TMethods, K>;
}[RequestMethodNames<TMethods>];

export type Notifications<TMethods extends RpcMethods<TMethods>> = {
	[K in NotificationMethodNames<TMethods>]: NotificationFor<TMethods, K>;
}[NotificationMethodNames<TMethods>];

export type StreamRequests<TMethods extends RpcMethods<TMethods>> = {
	[K in EventMethodNames<TMethods>]: StreamRequestFor<TMethods, K>;
}[EventMethodNames<TMethods>];

export type Responses<TMethods extends RpcMethods<TMethods>> = {
	[K in RequestMethodNames<TMethods>]: ResponseFor<TMethods, K>;
}[RequestMethodNames<TMethods>];

export type StreamControlMessages =
	| JsonRpcStreamUpdateNotification
	| JsonRpcStreamCancelNotification;

export type UpMessages<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> =
	| Requests<TServer>
	| Notifications<TServer>
	| StreamRequests<TServer>
	| Responses<TClient>
	| StreamControlMessages;

export type DownMessages<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> =
	| Requests<TClient>
	| Notifications<TClient>
	| StreamRequests<TClient>
	| Responses<TServer>
	| StreamControlMessages;

export type Protocol<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> = Duplex<UpMessages<TServer, TClient>, DownMessages<TServer, TClient>>;

export type ServerOf<TProtocol extends Protocol<any, any>> =
	TProtocol extends Protocol<infer TServer, infer _TClient> ? TServer : never;

export type ClientOf<TProtocol extends Protocol<any, any>> =
	TProtocol extends Protocol<infer _TServer, infer TClient> ? TClient : never;

export type ProtocolMethodNames<TMethods extends RpcMethods<TMethods>> =
	MethodName<TMethods>;
