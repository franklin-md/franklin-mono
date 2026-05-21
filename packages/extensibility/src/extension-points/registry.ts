import type { API, Signature } from '../api/types.js';
import type { OverloadedParameters } from '../utils/typing/overloads.js';

type MethodName<Surface extends object> = {
	[Name in keyof Surface]: Surface[Name] extends (
		...args: infer _Args
	) => unknown
		? Name
		: never;
}[keyof Surface];

export type EffectName<S extends Signature, Runtime extends S['In']> = Extract<
	MethodName<API<S, Runtime>>,
	PropertyKey
>;

export type EffectValueForName<
	S extends Signature,
	Runtime extends S['In'],
	Name extends EffectName<S, Runtime>,
> = OverloadedParameters<API<S, Runtime>[Name]>;

export type RegistrationMeta = {
	readonly priority: number;
};

export type RegistrationMetaInput = Partial<RegistrationMeta>;

export type EffectInput<
	Name extends PropertyKey = PropertyKey,
	Value = unknown,
> = {
	readonly name: Name;
	readonly value: Value;
	readonly meta?: RegistrationMetaInput;
};

export type EffectValue<
	Name extends PropertyKey = PropertyKey,
	Value = unknown,
> = {
	readonly name: Name;
	readonly value: Value;
	readonly meta: RegistrationMeta;
	readonly sequence: number;
};

export type EffectInputForName<
	S extends Signature,
	Runtime extends S['In'],
	Name extends EffectName<S, Runtime>,
> = EffectInput<Name, EffectValueForName<S, Runtime, Name>>;

export type EffectInputFor<S extends Signature, Runtime extends S['In']> = {
	readonly [Name in EffectName<S, Runtime>]: EffectInputForName<
		S,
		Runtime,
		Name
	>;
}[EffectName<S, Runtime>];

export function normalizeRegistrationMeta(
	meta: RegistrationMetaInput | undefined,
): RegistrationMeta {
	return {
		priority: meta?.priority ?? 0,
	};
}

export type EffectForName<
	S extends Signature,
	Runtime extends S['In'],
	Name extends EffectName<S, Runtime>,
> = EffectValue<Name, EffectValueForName<S, Runtime, Name>>;

export type EffectValueFor<S extends Signature, Runtime extends S['In']> = {
	readonly [Name in EffectName<S, Runtime>]: EffectForName<S, Runtime, Name>;
}[EffectName<S, Runtime>];

export type Registry<S extends Signature, Runtime extends S['In']> = {
	readonly effects: readonly EffectValueFor<S, Runtime>[];
};
