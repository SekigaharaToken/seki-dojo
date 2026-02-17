import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const PageWrapper = ({ className, children }) => {
  return (
    <motion.main
      className={cn("mx-auto w-full max-w-3xl px-4 py-6", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.main>
  );
};
