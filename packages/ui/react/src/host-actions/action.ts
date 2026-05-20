declare const hostActionSignature: unique symbol;

export type HostActionHandler = (...args: never[]) => unknown;

// This branded field is a compile-time signature carrier only. Runtime action
// tokens contain just `id`; the brand lets TypeScript recover the handler type
// when a host binds an implementation or React reads one from context.
export type HostAction<
	Name extends string = string,
	Handler extends HostActionHandler = HostActionHandler,
> = {
	readonly id: Name;
	readonly [hostActionSignature]: Handler;
};

export type HostActionHandlerOf<Action> =
	Action extends HostAction<string, infer Handler> ? Handler : never;

export function createHostAction<
	Name extends string,
	Handler extends HostActionHandler,
>(id: Name): HostAction<Name, Handler> {
	return { id } as HostAction<Name, Handler>;
}
