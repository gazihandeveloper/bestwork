import * as React from "react";
import { cn } from "@/lib/utils";

// Native <select> tabanlı shadcn tarzı seçici (react-hook-form register ile uyumlu).
function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "border-input bg-background text-foreground placeholder:text-muted-foreground h-10 w-full cursor-pointer rounded-full border px-4 text-sm shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Select };
