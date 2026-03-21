import type { Duplex } from '../../streams/types.js';
import type {
	JsonRpcEventCancelNotification,
	JsonRpcEventCompleteNotification,
	JsonRpcEventErrorNotification,
	JsonRpcEventInvocation,
	JsonRpcEventNextNotification,
	JsonRpcNotification,
	JsonRpcRequest,
	JsonRpcResponse,
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

export type EventInvocationFor<
	TMethods extends RpcMethods<TMethods>,
	TMethodName extends EventMethodNames<TMethods>,
> = JsonRpcEventInvocation<MethodParams<TMethods[TMethodName]>, TMethodName>;

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

export type EventInvocations<TMethods extends RpcMethods<TMethods>> = {
	[K in EventMethodNames<TMethods>]: EventInvocationFor<TMethods, K>;
}[EventMethodNames<TMethods>];

export type Responses<TMethods extends RpcMethods<TMethods>> = {
	[K in RequestMethodNames<TMethods>]: ResponseFor<TMethods, K>;
}[RequestMethodNames<TMethods>];

export type EventControlMessages =
	| JsonRpcEventNextNotification
	| JsonRpcEventCompleteNotification
	| JsonRpcEventErrorNotification
	| JsonRpcEventCancelNotification;

export type UpMessages<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> =
	| Requests<TServer>
	| Notifications<TServer>
	| EventInvocations<TServer>
	| Responses<TClient>
	| EventControlMessages;

export type DownMessages<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> =
	| Requests<TClient>
	| Notifications<TClient>
	| EventInvocations<TClient>
	| Responses<TServer>
	| EventControlMessages;

export type Protocol<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
> = Duplex<UpMessages<TServer, TClient>, DownMessages<TServer, TClient>>;

export type ServerOf<TProtocol extends Protocol<any, any>> =
	TProtocol extends Protocol<infer TServer, infer _TClient> ? TServer : never;

export type ClientOf<TProtocol extends Protocol<any, any>> =
	TProtocol extends Protocol<infer _TServer, infer TClient> ? TClient : never;

export type Reverse<TProtocol extends Protocol<any, any>> =
	TProtocol extends Protocol<infer TServer, infer TClient>
		? Protocol<TClient, TServer>
		: never;

export type ProtocolMethodNames<TMethods extends RpcMethods<TMethods>> =
	MethodName<TMethods>;
