export type SessionDetails = {
	id: string;
};

export type SessionState = {
	session: SessionDetails;
};

export function freshSessionState(): SessionState {
	return { session: { id: crypto.randomUUID() } };
}
