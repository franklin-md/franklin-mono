import type { API, BoundAPI } from '../api/types.js';
import type { OverloadedParameters } from '../../utils/typing/overloads.js';

type MethodName<Surface extends object> = {
	[Name in keyof Surface]: Surface[Name] extends (
		...args: infer _Args
	) => unknown
		? Name
		: never;
}[keyof Surface];

export type EffectName<A extends API, Runtime extends A['In']> = Extract<
	MethodName<BoundAPI<A, Runtime>>,
	string
>;

export type EffectValueForName<
	A extends API,
	Runtime extends A['In'],
	Name extends EffectName<A, Runtime>,
> = OverloadedParameters<BoundAPI<A, Runtime>[Name]>;

export type EffectValue<Name extends string = string, Value = unknown> = {
	readonly name: Name;
	readonly value: Value;
};

export type EffectForName<
	A extends API,
	Runtime extends A['In'],
	Name extends EffectName<A, Runtime>,
> = EffectValue<Name, EffectValueForName<A, Runtime, Name>>;

export type EffectValueFor<A extends API, Runtime extends A['In']> = {
	readonly [Name in EffectName<A, Runtime>]: EffectForName<A, Runtime, Name>;
}[EffectName<A, Runtime>];

export type Registry<A extends API, Runtime extends A['In']> = {
	readonly effects: readonly EffectValueFor<A, Runtime>[];
};
