export type HarnessModuleCompilerInput<S> = {
	readonly id: string;
	readonly state: S;
};

export function createHarnessModuleCompilerInput<S>(
	state: S,
	options?: { readonly id?: string },
): HarnessModuleCompilerInput<S> {
	return {
		id: options?.id ?? crypto.randomUUID(),
		state,
	};
}
