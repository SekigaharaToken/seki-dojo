import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, Globe, LogOut } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";
import { createPublicClient, http, formatUnits } from "viem";
import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import { useTheme } from "@/hooks/useTheme.js";
import { useLoginModal } from "@/hooks/useLoginModal.js";
import { useFarcaster } from "@/hooks/useFarcaster.js";
import { useMiniAppContext } from "@/hooks/useMiniAppContext.js";
import { activeChain } from "@/config/chains.js";
import { SEKI_TOKEN_ADDRESS, DOJO_TOKEN_ADDRESS } from "@/config/contracts.js";
import { cn } from "@/lib/utils";

const client = createPublicClient({ chain: activeChain, transport: http() });

const erc20BalanceAbi = [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] }];

/**
 * Format token balance with adaptive decimals.
 * Up to 8 decimals for small values, fewer as integer part grows.
 * Max supply 100M so integer never exceeds 9 digits.
 */
function formatBalance(raw) {
  const num = Number(formatUnits(raw, 18));
  if (num === 0) return "0";
  const intDigits = Math.max(1, Math.floor(Math.log10(Math.abs(num))) + 1);
  // 8 decimals when < 10, shrink as integer grows, min 0
  const decimals = Math.max(0, 8 - Math.max(0, intDigits - 1));
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ja", label: "JA" },
  { code: "kr", label: "KR" },
];

export const Header = () => {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const { openLoginModal } = useLoginModal();
  const { isAuthenticated, profile, signOut } = useFarcaster();
  const { context } = useMiniAppContext();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const location = useLocation();

  const isLoggedIn = isAuthenticated || isConnected;
  const fcUser = profile || context?.user;
  const displayName =
    fcUser?.displayName ||
    fcUser?.username ||
    (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "");
  const pfpUrl = fcUser?.pfpUrl || null;
  const initials = (fcUser?.displayName || fcUser?.username || "")
    .slice(0, 2)
    .toUpperCase();

  const [balances, setBalances] = useState({ seki: null, dojo: null, loading: false });

  function fetchBalances() {
    if (!address) return;
    setBalances({ seki: null, dojo: null, loading: true });
    const reads = [];
    if (SEKI_TOKEN_ADDRESS) {
      reads.push(
        client.readContract({ address: SEKI_TOKEN_ADDRESS, abi: erc20BalanceAbi, functionName: "balanceOf", args: [address] })
      );
    } else {
      reads.push(Promise.resolve(0n));
    }
    if (DOJO_TOKEN_ADDRESS) {
      reads.push(
        client.readContract({ address: DOJO_TOKEN_ADDRESS, abi: erc20BalanceAbi, functionName: "balanceOf", args: [address] })
      );
    } else {
      reads.push(Promise.resolve(0n));
    }
    Promise.all(reads)
      .then(([seki, dojo]) => setBalances({ seki, dojo, loading: false }))
      .catch(() => setBalances({ seki: 0n, dojo: 0n, loading: false }));
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        {/* Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link to="/" className="font-serif text-xl font-bold tracking-wide">
            {t("app.name")}
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                location.pathname === "/"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {t("nav.home")}
            </Link>
            <Link
              to="/swap"
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                location.pathname === "/swap"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {t("nav.swap")}
            </Link>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("a11y.changeLanguage")}>
                <Globe className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={cn(
                    i18n.language === lang.code && "font-bold",
                  )}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={t("a11y.toggleTheme")}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>

          {/* Auth / Wallet */}
          {isLoggedIn ? (
            <DropdownMenu onOpenChange={(open) => { if (open) fetchBalances(); }}>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar>
                    {pfpUrl && <AvatarImage src={pfpUrl} alt={displayName} />}
                    <AvatarFallback>{initials || "?"}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  <span className="font-mono">$SEKI</span>: {balances.loading ? <Skeleton className="ml-1 inline-block h-3 w-16" /> : formatBalance(balances.seki ?? 0n)}
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  <span className="font-mono">$DOJO</span>: {balances.loading ? <Skeleton className="ml-1 inline-block h-3 w-16" /> : formatBalance(balances.dojo ?? 0n)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { disconnect(); signOut?.(); }}>
                  <LogOut className="mr-2 size-4" />
                  {t("wallet.disconnect")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={openLoginModal}>
              {t("wallet.connect")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
