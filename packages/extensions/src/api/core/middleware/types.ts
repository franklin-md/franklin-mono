import type { MiniACPClient, MiniACPAgent } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Generic middleware primitives
// ---------------------------------------------------------------------------

// Koa-Style Middleware
// MethodMiddleware = (params:T, next: (params:T) => T) => T

export type MethodMiddleware<Fn extends (...args: any[]) => any> = (
	params: Parameters<Fn>[0],
	next: (params: Parameters<Fn>[0]) => ReturnType<Fn>,
) => ReturnType<Fn>;

export type Middleware<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any
		? MethodMiddleware<T[K]>
		: never;
};

// ---------------------------------------------------------------------------
// MiniACP-specific aliases
// ---------------------------------------------------------------------------

export type ServerMiddleware = Middleware<MiniACPClient>;
export type ClientMiddleware = Middleware<MiniACPAgent>;

export type FullMiddleware = {
	server?: ServerMiddleware;
	client?: ClientMiddleware;
};
