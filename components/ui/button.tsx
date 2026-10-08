import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const baseButtonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-heading text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-(--ease-out-expo) outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Pulse: the one action on a screen is the mint "go" button.
        default: "bg-go text-go-foreground shadow-go hover:bg-go-deep",
        brand: "bg-violet text-white shadow-violet hover:bg-violet-deep",
        outline:
          "border-edge-strong bg-card text-plum hover:border-violet/60 hover:text-violet-deep aria-expanded:border-violet aria-expanded:text-violet-deep",
        secondary:
          "bg-violet-wash text-violet-deep hover:bg-lilac aria-expanded:bg-lilac",
        ghost:
          "text-plum hover:bg-violet-wash hover:text-violet-deep aria-expanded:bg-violet-wash aria-expanded:text-violet-deep",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-violet-deep underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // Pulse: 44px+ tap targets for budget phones
        touch: "h-12 gap-2 px-4 text-[0.9375rem] font-semibold [&_svg:not([class*='size-'])]:size-5",
        xl: "h-14 gap-2.5 rounded-lg px-6 text-base font-semibold tracking-[0.01em] [&_svg:not([class*='size-'])]:size-5",
        "icon-touch": "size-12 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** cva joins classes; cn() then lets a passed className win over variant classes. */
function buttonVariants(props?: Parameters<typeof baseButtonVariants>[0]) {
  return cn(baseButtonVariants(props))
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof baseButtonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
