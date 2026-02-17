import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";

const HUNT_TOWN_URL = "https://hunt.town/project/SEKI";

export function BackSekiLink() {
  const { t } = useTranslation();

  return (
    <Button variant="secondary" size="sm" asChild>
      <a
        href={HUNT_TOWN_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("hunt.backSeki")}
        <ExternalLink className="size-3.5" />
      </a>
    </Button>
  );
}
