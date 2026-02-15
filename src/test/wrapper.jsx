/**
 * Test wrapper that provides all required context providers.
 */
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginModalProvider } from "@/context/LoginModalContext.jsx";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

/**
 * Mock providers for testing. Omits wagmi/RainbowKit/AuthKit/next-themes
 * since those require browser APIs. Components that need wallet state
 * should mock useFarcaster/useAccount directly.
 */
export const TestWrapper = ({ children, initialEntries = ["/"] }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <LoginModalProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </LoginModalProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
};
