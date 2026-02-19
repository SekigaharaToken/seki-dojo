import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import {
  Header,
  Footer,
  PageWrapper,
  NetworkGuardBanner,
  ErrorBoundary,
  LoginModal,
  Skeleton,
} from "@sekigahara/engine";
import HomePage from "@/pages/HomePage.jsx";
import HowItWorks from "@/components/dojo/HowItWorks.jsx";

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
      <HowItWorks />
      <LoginModal />
    </div>
  );
}

export default App;
