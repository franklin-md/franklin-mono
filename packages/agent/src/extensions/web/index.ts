export { createWebExtension } from './bundle.js';
export type { WebExtensionOptions } from './bundle.js';
// TODO: Keep web-fetch and web-search as independently owned surfaces; this
// barrel should only collect their public APIs, not decide their internals.
export * from './web-fetch/index.js';
export * from './web-search/index.js';
