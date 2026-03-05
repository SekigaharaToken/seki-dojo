import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  MiniAppLink,
} from "@sekigahara/engine";

const KAMON_URL = "https://seki-kamon.vercel.app";
const DISMISS_KEY = "kamon-promo-dismissed";

export function isKamonPromoDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function handleDismiss(onClose) {
  try {
    localStorage.setItem(DISMISS_KEY, "true");
  } catch {
    // localStorage unavailable — still close
  }
  onClose();
}

export function KamonPromoModal({ open, onClose }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="overflow-hidden border-0 bg-black p-0 sm:max-w-sm">
        <div className="flex flex-col items-center gap-4">
          <DialogHeader className="w-full bg-black px-6 pt-6 pb-3">
            <DialogTitle className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("kamon.modalTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex w-full flex-col items-center gap-4 rounded-b-lg bg-card px-6 pb-6 pt-4 text-card-foreground">
            <h2 className="text-center font-serif text-2xl font-bold">
              {t("kamon.headline")}
            </h2>

            <p className="text-center text-sm text-muted-foreground">
              {t("kamon.description")}
            </p>

            <MiniAppLink href={KAMON_URL} className="w-full">
              <Button size="lg" className="w-full">
                {t("kamon.cta")}
              </Button>
            </MiniAppLink>

            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => handleDismiss(onClose)}
            >
              {t("kamon.dismiss")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
