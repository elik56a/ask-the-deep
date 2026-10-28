import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";
import type * as React from "react";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-sunk [a]:hover:text-muted-foreground",
        ghost: "hover:bg-sunk hover:text-muted-foreground",
        // Panel metrics: numbers and ids, kept left-to-right inside Hebrew text.
        metric:
          "h-auto max-w-full whitespace-normal [overflow-wrap:anywhere] rounded-md px-2 py-1 font-medium font-mono text-xs tabular-nums leading-tight [direction:ltr] [unicode-bidi:isolate] bg-text/9 text-muted",
        ok: "h-auto max-w-full whitespace-normal [overflow-wrap:anywhere] rounded-md px-2 py-1 font-medium font-mono text-xs tabular-nums leading-tight [direction:ltr] [unicode-bidi:isolate] bg-text/9 text-ok",
        warn: "h-auto max-w-full whitespace-normal [overflow-wrap:anywhere] rounded-md px-2 py-1 font-medium font-mono text-xs tabular-nums leading-tight [direction:ltr] [unicode-bidi:isolate] bg-warn/16 text-warn",
        // A fact worth noticing, such as the history a follow-up carries.
        hi: "h-auto max-w-full whitespace-normal [overflow-wrap:anywhere] rounded-md px-2 py-1 font-medium font-mono text-xs tabular-nums leading-tight [direction:ltr] [unicode-bidi:isolate] bg-haze text-on-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
