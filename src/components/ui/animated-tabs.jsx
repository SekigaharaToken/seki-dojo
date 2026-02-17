import * as React from "react";
import { motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Animated tab trigger with a sliding background indicator.
 * Uses Framer Motion layoutId for smooth horizontal sliding between tabs.
 *
 * Must be used inside a TabsList. Provide a unique `layoutId` string
 * shared across sibling triggers for the sliding effect.
 */
function AnimatedTabsTrigger({
  className,
  children,
  layoutId = "tab-indicator",
  value,
  ...props
}) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors",
        "text-foreground/60 hover:text-foreground",
        "data-[state=active]:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {props["data-state"] === "active" && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-md bg-background shadow-sm dark:bg-input/30"
          style={{ zIndex: -1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {children}
    </TabsPrimitive.Trigger>
  );
}

/**
 * Wrapper that injects data-state into AnimatedTabsTrigger children
 * by reading the current Tabs value from context.
 */
function AnimatedTabsList({ className, activeValue, children, ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          "data-state": child.props.value === activeValue ? "active" : "inactive",
        });
      })}
    </TabsPrimitive.List>
  );
}

export { AnimatedTabsTrigger, AnimatedTabsList };
