import type { ReactNode } from 'react';

import { createSimpleContext } from '../utils/create-simple-context.js';

export type AuthActionRequest = {
	provider: string;
	displayName: string;
};

export type AuthActionHandler = (
	request: AuthActionRequest,
) => Promise<void> | void;

export type AuthActionHandlers = {
	requestApiKey: AuthActionHandler;
};

export type AuthActionProviderProps = {
	children: ReactNode;
	handlers: AuthActionHandlers;
};

const [AuthActionValueProvider, useAuthActionHandlers] =
	createSimpleContext<AuthActionHandlers>('AuthAction');

export { useAuthActionHandlers };

export function AuthActionProvider({
	children,
	handlers,
}: AuthActionProviderProps) {
	return (
		<AuthActionValueProvider value={handlers}>
			{children}
		</AuthActionValueProvider>
	);
}
