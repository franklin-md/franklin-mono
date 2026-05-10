/**
 * Base constraint for harness state records.
 *
 * State is a flat top-level namespace keyed by module (e.g. `{ core, store,
 * env }`); `combine()` composes state via object spread, which is why a
 * string-keyed record is the natural constraint.
 */
export type BaseState = Record<string, unknown>;
