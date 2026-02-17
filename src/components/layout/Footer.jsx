import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator.jsx";
import { version } from "../../../package.json";

/* global __COMMIT_HASH__ */
const appVersion = `v${version}-${__COMMIT_HASH__}`;

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto">
      <Separator />
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 text-sm text-muted-foreground">
        <span>{t("footer.builtOn")}</span>
        <span className="font-mono text-xs">{appVersion}</span>
        <span>{t("footer.poweredBy")}</span>
      </div>
    </footer>
  );
};
