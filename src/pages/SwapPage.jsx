import { useTranslation } from "react-i18next";

export default function SwapPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <h1 className="font-serif text-3xl font-bold">{t("swap.title")}</h1>
    </div>
  );
}
