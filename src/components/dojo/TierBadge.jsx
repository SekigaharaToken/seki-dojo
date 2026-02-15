import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge.jsx";

const TIER_STYLES = {
  "tier-white": "bg-white text-stone-900 border-stone-300",
  "tier-blue": "bg-blue-600 text-white border-blue-700",
  "tier-purple": "bg-purple-600 text-white border-purple-700",
  "tier-black": "bg-stone-900 text-white border-stone-800",
};

export function TierBadge({ tier }) {
  const { t } = useTranslation();

  if (!tier) return null;

  return (
    <Badge
      variant="outline"
      className={TIER_STYLES[tier.color] ?? ""}
    >
      {t(tier.nameKey)}
    </Badge>
  );
}
