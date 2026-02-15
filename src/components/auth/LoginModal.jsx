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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useLoginModal } from "@/hooks/useLoginModal.js";
import { useFarcasterSignIn } from "@/hooks/useFarcasterSignIn.js";
import { useFarcaster } from "@/hooks/useFarcaster.js";

export const LoginModal = ({ onSuccess }) => {
  const { isLoginModalOpen, closeLoginModal } = useLoginModal();
  const { isAuthenticated } = useFarcaster();

  const handleSuccess = useCallback(
    (res) => {
      closeLoginModal();
      onSuccess?.(res);
    },
    [closeLoginModal, onSuccess],
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
            Sign In With Farcaster
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with Warpcast to sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {!showQrView && !isLoading && (
            <Button onClick={handleSignInClick} className="w-full">
              Connect with Farcaster
            </Button>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Creating connection...</span>
            </div>
          )}

          {showQrView && url && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg border bg-white p-4">
                <QRCodeSVG value={url} size={200} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan with Warpcast or{" "}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  open directly
                </a>
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  handleCancel();
                  closeLoginModal();
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
