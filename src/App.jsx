import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Home, ArrowLeftRight, LayoutGrid } from "lucide-react";
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
const AppsPage = lazy(() => import("@/pages/AppsPage.jsx"));
const ClaimPage = lazy(() => import("@/pages/ClaimPage.jsx"));

const NAV_ITEMS = [
  { to: "/", icon: Home, labelKey: "nav.home" },
  { to: "/swap", icon: ArrowLeftRight, labelKey: "nav.swap" },
  { to: "/apps", icon: LayoutGrid, labelKey: "nav.apps" },
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
              <Route path="/apps" element={<AppsPage />} />
              <Route path="/claim" element={<ClaimPage />} />
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
