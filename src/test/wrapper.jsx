/**
 * Test wrapper that provides all required context providers.
 */
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  LoginModalProvider,
  EngineConfigProvider,
  initI18n,
} from "@sekigahara/engine";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import appEn from "../i18n/locales/app.en.json";
import appJa from "../i18n/locales/app.ja.json";
import appKr from "../i18n/locales/app.kr.json";

// Initialize i18n for tests.
// Engine barrel may have already initialized i18n (via engine's TestWrapper export),
// so we always ensure DOJO translations are loaded via addResourceBundle.
if (!i18n.isInitialized) {
  initI18n({ en: appEn, ja: appJa, kr: appKr });
} else {
  // Merge DOJO app translations into the already-initialized instance
  for (const [lang, translations] of Object.entries({ en: appEn, ja: appJa, kr: appKr })) {
    const existing = i18n.getResourceBundle(lang, "translation") || {};
    i18n.addResourceBundle(lang, "translation", { ...existing, ...translations }, true, true);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const testEngineConfig = {
  appName: "TestApp",
  storagePrefix: "test",
  accentColor: "#000000",
  swapTokens: [],
};

/**
 * Mock providers for testing. Omits wagmi/RainbowKit/AuthKit/next-themes
 * since those require browser APIs. Components that need wallet state
 * should mock useFarcaster/useAccount directly.
 */
export const TestWrapper = ({ children, initialEntries = ["/"] }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <EngineConfigProvider config={testEngineConfig}>
          <LoginModalProvider>
            <MemoryRouter initialEntries={initialEntries}>
              {children}
            </MemoryRouter>
          </LoginModalProvider>
        </EngineConfigProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
};
