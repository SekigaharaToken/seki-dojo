import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <h1 className="font-serif text-3xl font-bold">{t("app.name")}</h1>
      <p className="text-muted-foreground">{t("app.tagline")}</p>
    </div>
  );
}
