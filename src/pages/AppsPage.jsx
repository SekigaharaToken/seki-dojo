import { useTranslation } from "react-i18next";
import { ExternalLink, Shield } from "lucide-react";
import { motion } from "motion/react";
import { Button, fadeInUp, staggerDelay } from "@sekigahara/engine";
import { MiniAppLink } from "@/components/ui/MiniAppLink.jsx";

const APPS = [
  {
    labelKey: "hunt.backSeki",
    href: "https://hunt.town/project/SEKI",
    icon: ExternalLink,
  },
  {
    labelKey: "apps.kamon",
    href: "https://seki-kamon.vercel.app",
    icon: Shield,
  },
];

export default function AppsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <motion.h1 className="font-serif text-3xl font-bold" {...fadeInUp}>
        {t("apps.title")}
      </motion.h1>
      <motion.p
        className="text-muted-foreground"
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, ...staggerDelay(1) }}
      >
        {t("apps.subtitle")}
      </motion.p>

      <motion.div
        className="flex w-full max-w-sm flex-col gap-3"
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, ...staggerDelay(2) }}
      >
        {APPS.map(({ labelKey, href, icon: Icon }) => (
          <MiniAppLink key={href} href={href} className="w-full">
            <Button variant="outline" size="lg" className="w-full justify-start gap-3">
              <Icon className="size-5" />
              {t(labelKey)}
            </Button>
          </MiniAppLink>
        ))}
      </motion.div>
    </div>
  );
}
