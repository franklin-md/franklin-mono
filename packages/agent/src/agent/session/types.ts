import type { RuntimeBase } from '@franklin/extensions';

export type Session<RT extends RuntimeBase<any>> = {
	sessionId: string;
	runtime: RT;
};

export type SessionSnapshot<S> = {
	sessionId: string;
	state: S;
};
