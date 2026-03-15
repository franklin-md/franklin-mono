type AnyHandler = (data: unknown) => unknown;
type HandlerMap = Record<string, AnyHandler>;

type HandlerId<THandlers extends HandlerMap> = Extract<keyof THandlers, string>;

export type TagDispatchArgs<
	THandlers extends HandlerMap,
	K extends HandlerId<THandlers>,
> = Parameters<THandlers[K]>[0];

export type TagDispatchResult<
	THandlers extends HandlerMap,
	K extends HandlerId<THandlers>,
> = ReturnType<THandlers[K]>;

export type TagDispatch<THandlers extends HandlerMap> = <
	K extends HandlerId<THandlers>,
>(
	tag: K,
	args: TagDispatchArgs<THandlers, K>,
) => TagDispatchResult<THandlers, K>;

/**
 * Creates a tag dispatcher that routes `(tag, args)` to the matching handler
 * and preserves the exact return type for each tag.
 */
export function createTagDispatch<THandlers extends HandlerMap>(
	handlers: THandlers,
): TagDispatch<THandlers> {
	return <K extends HandlerId<THandlers>>(
		tag: K,
		args: TagDispatchArgs<THandlers, K>,
	): TagDispatchResult<THandlers, K> => {
		const handler = handlers[tag];
		if (!handler) {
			throw new Error(`No handler found for tag "${tag}"`);
		}
		const typedHandler = handler as (
			data: TagDispatchArgs<THandlers, K>,
		) => TagDispatchResult<THandlers, K>;
		return typedHandler(args);
	};
}
