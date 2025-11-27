/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_FACEBOOK_APP_ID: string;
  readonly VITE_FACEBOOK_CONFIG_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Facebook SDK types
interface Window {
  FB?: {
    init(params: {
      appId: string;
      cookie?: boolean;
      xfbml?: boolean;
      version: string;
    }): void;
    login(
      callback: (response: {
        authResponse?: {
          code?: string;
          accessToken?: string;
          userID?: string;
        };
        status: string;
      }) => void,
      options?: {
        config_id?: string;
        response_type?: string;
        override_default_response_type?: boolean;
        extras?: Record<string, unknown>;
      }
    ): void;
    getLoginStatus(
      callback: (response: { status: string }) => void
    ): void;
  };
  fbAsyncInit?: () => void;
}
