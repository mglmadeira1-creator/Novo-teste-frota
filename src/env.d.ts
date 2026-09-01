/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly CARTRACK_USERNAME?: string;
  readonly CARTRACK_PASSWORD?: string;
  readonly CARTRACK_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
