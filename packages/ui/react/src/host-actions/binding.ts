import type { HostAction, HostActionHandlerOf } from './action.js';

export type HostActionBinding<Action extends HostAction = HostAction> = {
	readonly action: Action;
	readonly handler: HostActionHandlerOf<Action>;
};

export function bindHostAction<Action extends HostAction>(
	action: Action,
	handler: HostActionHandlerOf<Action>,
): HostActionBinding<Action> {
	return { action, handler };
}
