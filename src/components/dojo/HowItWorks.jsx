import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  BackSekiLink,
  Button,
  Badge,
} from "@sekigahara/engine";
import {
  X,
  Rocket,
  Wallet,
  ArrowLeftRight,
  CalendarCheck,
  Flame,
} from "lucide-react";
import { useLocalDismiss } from "@/hooks/useLocalDismiss.js";
import { STREAK_TIERS } from "@/config/constants.js";

const STORAGE_KEY = "dojo:how-it-works-dismissed";
const TOTAL_PAGES = 5;
const SWIPE_THRESHOLD = 50;

function PageIcon({ icon: Icon }) {
  return (
    <div className="flex justify-center py-4">
      <div className="bg-primary/10 rounded-full p-4">
        <Icon className="text-primary size-8" />
      </div>
    </div>
  );
}

function PaginationDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "bg-primary w-6"
              : "bg-muted-foreground/30 w-2"
          }`}
        />
      ))}
    </div>
  );
}

function TierTable({ t }) {
  return (
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr className="text-muted-foreground border-b text-left">
          <th className="pb-2 font-medium" />
          <th className="pb-2 font-medium">{t("howItWorks.tierStreak")}</th>
          <th className="pb-2 text-right font-medium">
            {t("howItWorks.tierReward")}
          </th>
        </tr>
      </thead>
      <tbody>
        {STREAK_TIERS.map((tier, i) => (
          <tr
            key={tier.id}
            className={i % 2 === 1 ? "bg-muted/50" : ""}
          >
            <td className="py-1.5 pr-2">
              <Badge variant="outline" className={`${tier.color} text-xs`}>
                {t(tier.nameKey)}
              </Badge>
            </td>
            <td className="py-1.5">
              {tier.max === Infinity
                ? t("howItWorks.tierDaysMax", { min: tier.min })
                : t("howItWorks.tierDays", {
                    min: tier.min,
                    max: tier.max,
                  })}
            </td>
            <td className="py-1.5 text-right font-medium">
              {tier.reward} $DOJO
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PageContent({ page, t }) {
  const pages = [
    {
      icon: Rocket,
      titleKey: "howItWorks.page1Title",
      descKey: "howItWorks.page1Desc",
      extra: (
        <div className="flex justify-center pt-2">
          <BackSekiLink />
        </div>
      ),
    },
    {
      icon: Wallet,
      titleKey: "howItWorks.page2Title",
      descKey: "howItWorks.page2Desc",
    },
    {
      icon: ArrowLeftRight,
      titleKey: "howItWorks.page3Title",
      descKey: "howItWorks.page3Desc",
    },
    {
      icon: CalendarCheck,
      titleKey: "howItWorks.page4Title",
      descKey: "howItWorks.page4Desc",
    },
    {
      icon: Flame,
      titleKey: "howItWorks.page5Title",
      descKey: "howItWorks.page5Desc",
      extra: (
        <>
          <TierTable t={t} />
          <p className="text-muted-foreground mt-3 text-xs">
            {t("howItWorks.page5RateNote")}
          </p>
        </>
      ),
    },
  ];

  const { icon, titleKey, descKey, extra } = pages[page];

  return (
    <div className="flex flex-col items-center px-2 text-center">
      <PageIcon icon={icon} />
      <h3 className="text-lg font-bold">{t(titleKey)}</h3>
      <p className="text-muted-foreground mt-2 text-sm">{t(descKey)}</p>
      {extra}
    </div>
  );
}

export function HowItWorks() {
  const { t } = useTranslation("app");
  const [dismissed, dismiss] = useLocalDismiss(STORAGE_KEY);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const touchStartX = useRef(0);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta > 0 && currentPage < TOTAL_PAGES - 1) {
      setCurrentPage((p) => p + 1);
    } else if (delta < 0 && currentPage > 0) {
      setCurrentPage((p) => p - 1);
    }
  }

  function openSheet() {
    setCurrentPage(0);
    setSheetOpen(true);
  }

  const showBar = !dismissed && !sheetOpen;

  return (
    <>
      {showBar && (
        <div className="bg-primary text-primary-foreground fixed inset-x-0 bottom-0 z-40 flex items-center justify-between px-4 py-3">
          <button
            type="button"
            className="flex-1 text-left text-sm font-medium"
            onClick={openSheet}
          >
            {t("howItWorks.barText")}
          </button>
          <button
            type="button"
            className="hover:bg-primary-foreground/10 ml-2 rounded-full p-1"
            onClick={dismiss}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80svh]"
        >
          <SheetHeader>
            <SheetTitle>{t("howItWorks.title")}</SheetTitle>
          </SheetHeader>

          <div
            className="flex-1 overflow-y-auto px-4 py-2"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <PageContent page={currentPage} t={t} />
          </div>

          <SheetFooter className="flex-col gap-4">
            <PaginationDots current={currentPage} total={TOTAL_PAGES} />
            <div className="flex gap-2">
              {currentPage > 0 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  {t("howItWorks.back")}
                </Button>
              )}
              {currentPage < TOTAL_PAGES - 1 ? (
                <Button
                  className="flex-1"
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  {t("howItWorks.next")}
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={() => setSheetOpen(false)}
                >
                  {t("howItWorks.done")}
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default HowItWorks;
