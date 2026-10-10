// vite isn't a direct dependency, so vite/client types aren't resolvable here.
// Script file (no imports/exports) so the wildcard module and ImportMeta merge globally.
declare module '*.png' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
