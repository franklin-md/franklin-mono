export type RpcRequestMethod<TParams = unknown, TResult = unknown> = (
	params: TParams,
) => Promise<TResult>;

export type RpcNotificationMethod<TParams = unknown> = (
	params: TParams,
) => Promise<void>;

export type RpcEventMethod<TParams = unknown, TResult = unknown> = (
	params: TParams,
) => AsyncIterable<TResult>;

export type RpcMethod<TParams = unknown, TResult = unknown> =
	| RpcRequestMethod<TParams, TResult>
	| RpcNotificationMethod<TParams>
	| RpcEventMethod<TParams, TResult>;

export type RpcUnaryMethod<
	TParams = unknown,
	TResult = unknown,
> = RpcRequestMethod<TParams, TResult>;
export type RpcStreamMethod<
	TParams = unknown,
	TResult = unknown,
> = RpcEventMethod<TParams, TResult>;

export type RpcMethods<TMethods extends object = object> = {
	[K in keyof TMethods]: RpcMethod<any, any>;
};

export type MethodName<TMethods extends RpcMethods<TMethods>> = Extract<
	keyof TMethods,
	string
>;

type AsyncReturn<TMethod extends RpcMethod> = TMethod extends (
	...args: never[]
) => infer TResult
	? TResult
	: never;

type IsNotificationResult<T> =
	Promise<T> extends Promise<void>
		? Promise<void> extends Promise<T>
			? true
			: false
		: false;

export type MethodParams<TMethod extends RpcMethod> = Parameters<TMethod>[0];

export type MethodResult<TMethod extends RpcMethod> =
	AsyncReturn<TMethod> extends AsyncIterable<infer TItem>
		? TItem
		: Awaited<AsyncReturn<TMethod>>;

export type MethodKind<TMethod extends RpcMethod> =
	AsyncReturn<TMethod> extends AsyncIterable<unknown>
		? 'event'
		: AsyncReturn<TMethod> extends Promise<infer TResult>
			? IsNotificationResult<TResult> extends true
				? 'notification'
				: 'request'
			: 'request';

export type MethodIsStream<TMethod extends RpcMethod> =
	MethodKind<TMethod> extends 'event' ? true : false;

export type MethodSpec<TMethod extends RpcMethod> = {
	params: MethodParams<TMethod>;
	result: MethodResult<TMethod>;
	kind: MethodKind<TMethod>;
};

export type MethodSpecs<TMethods extends RpcMethods<TMethods>> = {
	[K in MethodName<TMethods>]: MethodSpec<TMethods[K]>;
};

export type RequestMethodNames<TMethods extends RpcMethods<TMethods>> = Extract<
	{
		[K in MethodName<TMethods>]: MethodKind<TMethods[K]> extends 'request'
			? K
			: never;
	}[MethodName<TMethods>],
	string
>;

export type UnaryMethodNames<TMethods extends RpcMethods<TMethods>> =
	RequestMethodNames<TMethods>;

export type NotificationMethodNames<TMethods extends RpcMethods<TMethods>> =
	Extract<
		{
			[K in MethodName<TMethods>]: MethodKind<
				TMethods[K]
			> extends 'notification'
				? K
				: never;
		}[MethodName<TMethods>],
		string
	>;

export type EventMethodNames<TMethods extends RpcMethods<TMethods>> = Extract<
	{
		[K in MethodName<TMethods>]: MethodKind<TMethods[K]> extends 'event'
			? K
			: never;
	}[MethodName<TMethods>],
	string
>;
