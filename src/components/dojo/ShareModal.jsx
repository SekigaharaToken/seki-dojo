import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from "@sekigahara/engine";
import { TierBadge } from "./TierBadge.jsx";

export function ShareModal({ open, onClose, currentStreak, currentTier, onShare }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="share-modal overflow-hidden border-0 bg-black p-0 sm:max-w-sm"
      >
        <div className="share-modal-content flex flex-col items-center gap-4">
          <DialogHeader className="w-full bg-black px-6 pt-6 pb-3">
            <DialogTitle className="text-center text-xl font-bold text-white">
              {t("share.modalTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex w-full flex-col items-center gap-4 rounded-b-lg bg-card px-6 pb-6 pt-4 text-card-foreground">
            <span className="font-serif text-5xl font-bold">{currentStreak}</span>
            <p className="text-sm text-muted-foreground">{t("streak.current")}</p>

            {currentTier && <TierBadge tier={currentTier} />}

            <Button
              size="lg"
              className="mt-2 w-full gap-2 text-white"
              style={{ backgroundColor: "#855DCD" }}
              onClick={onShare}
            >
              <img src="/farcaster-icon-white.svg" alt="" className="size-5" aria-hidden="true" />
              {t("share.toFarcaster")}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              {t("share.close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
