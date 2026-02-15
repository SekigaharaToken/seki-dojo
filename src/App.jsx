import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header.jsx";
import { Footer } from "@/components/layout/Footer.jsx";
import { PageWrapper } from "@/components/layout/PageWrapper.jsx";
import { NetworkGuardBanner } from "@/components/layout/NetworkGuardBanner.jsx";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary.jsx";
import { LoginModal } from "@/components/auth/LoginModal.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import HomePage from "@/pages/HomePage.jsx";

const SwapPage = lazy(() => import("@/pages/SwapPage.jsx"));

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <NetworkGuardBanner />
      <Header />
      <ErrorBoundary>
        <PageWrapper>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/swap" element={<SwapPage />} />
            </Routes>
          </Suspense>
        </PageWrapper>
      </ErrorBoundary>
      <Footer />
      <LoginModal />
    </div>
  );
}

export default App;
