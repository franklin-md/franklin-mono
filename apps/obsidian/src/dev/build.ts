// Decides whether dev-only UI and state exist, e.g. `isDevBuild && <Button />`.
// esbuild inlines this across modules only after removing dead branches, so
// the dev-only code still ships unused in production builds. Code that must be
// stripped from the production bundle, such as dev dependency imports, checks
// `process.env.NODE_ENV` inline instead (see react-scan.ts).
export const isDevBuild = process.env.NODE_ENV === 'development';
