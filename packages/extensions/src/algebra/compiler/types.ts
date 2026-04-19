export type Compiler<API, S, Runtime> = {
	readonly api: API;
	build(state: S, getRuntime: () => Runtime): Promise<Runtime>;
};
