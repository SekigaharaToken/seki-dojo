import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, Globe, LogOut } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import { useTheme } from "@/hooks/useTheme.js";
import { useLoginModal } from "@/hooks/useLoginModal.js";
import { useFarcaster } from "@/hooks/useFarcaster.js";
import { cn } from "@/lib/utils";

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
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const location = useLocation();

  const isLoggedIn = isAuthenticated || isConnected;
  const displayName =
    profile?.displayName ||
    (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "");

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
          <nav className="hidden items-center gap-4 sm:flex">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {displayName}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
