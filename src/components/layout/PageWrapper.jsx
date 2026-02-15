import { cn } from "@/lib/utils";

export const PageWrapper = ({ className, children }) => {
  return (
    <main className={cn("mx-auto w-full max-w-3xl px-4 py-6", className)}>
      {children}
    </main>
  );
};
