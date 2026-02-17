import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { TierBadge } from "./TierBadge.jsx";

export function ShareModal({ open, onClose, currentStreak, currentTier, onShare }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="share-modal overflow-hidden border-0 bg-black p-0 text-white sm:max-w-sm"
      >
        <div className="share-modal-content flex flex-col items-center gap-4 p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-white">
              {t("share.modalTitle")}
            </DialogTitle>
          </DialogHeader>

          <span className="font-serif text-5xl font-bold">{currentStreak}</span>
          <p className="text-sm text-neutral-400">{t("streak.current")}</p>

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
            className="w-full border-neutral-600 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={onClose}
          >
            {t("share.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
