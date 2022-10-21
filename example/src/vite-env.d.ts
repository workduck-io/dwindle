/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_COGNITO_POOL_ID: string
  readonly VITE_APP_COGNITO_POOL_ID: string
  readonly VITE_APP_COGNITO_IDENTITY_POOL_ID: string
  readonly VITE_APP_COGNITO_IDENTITY_PROVIDER: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
