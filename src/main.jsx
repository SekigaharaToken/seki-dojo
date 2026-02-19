import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { AuthKitProvider } from "@farcaster/auth-kit";
import { ThemeProvider } from "next-themes";
import {
  Toaster,
  MiniAppAutoConnect,
  FarcasterProvider,
  LoginModalProvider,
  EngineConfigProvider,
  createWagmiConfig,
  initI18n,
  setStoragePrefix,
} from "@sekigahara/engine";
import { SWAP_TOKENS } from "@/config/contracts.js";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";
import appEn from "./i18n/locales/app.en.json";
import appJa from "./i18n/locales/app.ja.json";
import appKr from "./i18n/locales/app.kr.json";
import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";

// Initialize i18n with DOJO app translations
initI18n({ en: appEn, ja: appJa, kr: appKr });

// Set storage prefix for immutable cache
setStoragePrefix("dojo");

const wagmiConfig = createWagmiConfig({ appName: "DOJO" });

const engineConfig = {
  appName: "DOJO",
  storagePrefix: "dojo",
  accentColor: "#B33030",
  swapTokens: SWAP_TOKENS,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
});

const authKitConfig = {
  rpcUrl: "https://mainnet.optimism.io",
  domain: typeof window !== "undefined" ? window.location.host : "localhost",
  siweUri: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <EngineConfigProvider config={engineConfig}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <MiniAppAutoConnect />
            <AuthKitProvider config={authKitConfig}>
              <RainbowKitProvider
                theme={darkTheme({
                  accentColor: engineConfig.accentColor,
                  borderRadius: "medium",
                })}
              >
                <FarcasterProvider>
                  <LoginModalProvider>
                    <BrowserRouter>
                      <App />
                      <Toaster />
                      <Analytics />
                    </BrowserRouter>
                  </LoginModalProvider>
                </FarcasterProvider>
              </RainbowKitProvider>
            </AuthKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </EngineConfigProvider>
    </ThemeProvider>
  </StrictMode>,
);
