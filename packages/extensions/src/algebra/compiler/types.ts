/**
 * A compiler is a registration surface (`api`) plus a `build` step that
 * materialises the runtime. State is configured at compiler-creation time
 * by the system (`RuntimeSystem.createCompiler(state)`) and captured in
 * the compiler's closure — it never appears in the compiler's type.
 */
export type Compiler<API, Runtime> = {
	readonly api: API;
	build(getRuntime: () => Runtime): Promise<Runtime>;
};
