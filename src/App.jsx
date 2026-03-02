import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Home, ArrowLeftRight } from "lucide-react";
import {
  Header,
  Footer,
  BottomNav,
  PageWrapper,
  NetworkGuardBanner,
  ErrorBoundary,
  LoginModal,
  Skeleton,
} from "@sekigahara/engine";
import HomePage from "@/pages/HomePage.jsx";
import HowItWorks from "@/components/dojo/HowItWorks.jsx";

const SwapPage = lazy(() => import("@/pages/SwapPage.jsx"));

const NAV_ITEMS = [
  { to: "/", icon: Home, labelKey: "nav.home" },
  { to: "/swap", icon: ArrowLeftRight, labelKey: "nav.swap" },
];

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
      <BottomNav items={NAV_ITEMS} />
      <HowItWorks />
      <LoginModal />
    </div>
  );
}

export default App;
