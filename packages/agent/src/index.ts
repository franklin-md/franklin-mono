// TODO(FRA-?): consolidate browser.ts into index.ts so the package has a
// single entry point and explicit named exports replace the wildcard.
export * from './browser.js';

export { createPersistence } from './storage/persistence.js';
