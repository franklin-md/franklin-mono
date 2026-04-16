export type DependencyAPI<Name extends string, T> = {
	[K in `get${Name}`]: () => T;
};
