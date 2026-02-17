/**
 * LoginModal — Sign In With Farcaster modal.
 *
 * Adapted from SecondOrder (commit 87e0d786).
 * Shows a QR code for Warpcast SIWF flow.
 * Uses shadcn Dialog + qrcode.react.
 */

import { useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useTranslation } from "react-i18next";
import { useLoginModal } from "@/hooks/useLoginModal.js";
import { useFarcasterSignIn } from "@/hooks/useFarcasterSignIn.js";
import { useFarcaster } from "@/hooks/useFarcaster.js";

export const LoginModal = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { isLoginModalOpen, closeLoginModal } = useLoginModal();
  const { isAuthenticated } = useFarcaster();
  const { openConnectModal } = useConnectModal();

  const handleSuccess = useCallback(
    (res) => {
      closeLoginModal();
      openConnectModal?.();
      onSuccess?.(res);
    },
    [closeLoginModal, openConnectModal, onSuccess],
  );

  const {
    handleSignInClick,
    handleCancel,
    showQrView,
    url,
    isLoading,
  } = useFarcasterSignIn({
    onSuccess: handleSuccess,
  });

  const handleOpenChange = useCallback(
    (open) => {
      if (!open) {
        handleCancel();
        closeLoginModal();
      }
    },
    [handleCancel, closeLoginModal],
  );

  if (isAuthenticated) return null;

  return (
    <Dialog open={isLoginModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {t("auth.signInWithFarcaster")}
          </DialogTitle>
          <DialogDescription>
            {t("auth.signInDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {!showQrView && !isLoading && (
            <Button onClick={handleSignInClick} className="w-full">
              {t("auth.connectWithFarcaster")}
            </Button>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>{t("auth.creatingConnection")}</span>
            </div>
          )}

          {showQrView && url && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg border bg-white p-4" aria-label={t("a11y.qrCode")}>
                <QRCodeSVG value={url} size={200} role="img" aria-label={t("a11y.qrCode")} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t("auth.scanQrCode")}{" "}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {t("auth.openDirectly")}
                </a>
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  handleCancel();
                  closeLoginModal();
                }}
              >
                {t("auth.cancel")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
