export interface Builder<T> {
	add(item: T): Builder<T>;
	done(): T;
}

export function builder<T>(value: T, combine: (a: T, b: T) => T): Builder<T> {
	return {
		add(item) {
			return builder(combine(value, item), combine);
		},
		done() {
			return value;
		},
	};
}
