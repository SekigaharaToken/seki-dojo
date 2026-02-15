import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { AuthKitProvider } from "@farcaster/auth-kit";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner.jsx";
import { FarcasterProvider } from "@/context/FarcasterProvider.jsx";
import { LoginModalProvider } from "@/context/LoginModalContext.jsx";
import { wagmiConfig } from "@/config/wagmi.js";
import App from "./App.jsx";
import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";

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
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AuthKitProvider config={authKitConfig}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: "#B33030",
                borderRadius: "medium",
              })}
            >
              <FarcasterProvider>
                <LoginModalProvider>
                  <BrowserRouter>
                    <App />
                    <Toaster />
                  </BrowserRouter>
                </LoginModalProvider>
              </FarcasterProvider>
            </RainbowKitProvider>
          </AuthKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </StrictMode>,
);
