declare module '*.svg' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
