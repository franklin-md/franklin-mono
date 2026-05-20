import { createHostAction } from './action.js';
import { useHostAction } from './use-host-action.js';

export const openExternalAction = createHostAction<
	'host.openExternal',
	(url: string) => Promise<void> | void
>('host.openExternal');

export function useOpenExternal(): (url: string) => Promise<void> | void {
	return useHostAction(openExternalAction);
}
