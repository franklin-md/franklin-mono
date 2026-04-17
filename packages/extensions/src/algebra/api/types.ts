/**
 * Base constraint for extension APIs.
 *
 * An API is an object-like registration surface (collectors) that
 * extensions call to register handlers, tools, stores, etc. Composition
 * operators merge APIs via object spread, so any object-shape is admissible.
 */
export type BaseAPI = object;
