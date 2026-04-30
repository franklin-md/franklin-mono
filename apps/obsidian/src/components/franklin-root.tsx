import type { FranklinApp } from '@franklin/agent/browser';
import type { AuthActionHandler } from '@franklin/react';
import { AppContext, AuthActionProvider } from '@franklin/react';
import type { ReactNode } from 'react';

type Props = {
	app: FranklinApp;
	children: ReactNode;
	requestApiKey: AuthActionHandler;
};

export function FranklinRoot({ app, children, requestApiKey }: Props) {
	return (
		<AppContext.Provider value={app}>
			<AuthActionProvider handlers={{ requestApiKey }}>
				{children}
			</AuthActionProvider>
		</AppContext.Provider>
	);
}
