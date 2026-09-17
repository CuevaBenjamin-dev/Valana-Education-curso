/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CLARITY_PROJECT_ID?: string;
  readonly PUBLIC_META_PIXEL_ID?: string;
  readonly PUBLIC_TIKTOK_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
