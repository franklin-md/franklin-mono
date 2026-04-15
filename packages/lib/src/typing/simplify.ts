// Materialize composed object types into a single surface for clearer editor
// hovers. Inspired by type-fest's `Simplify` helpers:
// https://github.com/sindresorhus/type-fest/blob/main/source/simplify.d.ts
// https://github.com/sindresorhus/type-fest/blob/main/source/simplify-deep.d.ts
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};
