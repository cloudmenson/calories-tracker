import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    label?: string;
  }
>(({ className, children, label, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
    )}
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 dark:border-[#27273a] bg-gray-50 dark:bg-[#1e1e2c] px-4 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white dark:focus:bg-[#252538]",
        "transition-all duration-200 text-gray-900 dark:text-gray-100",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
    </SelectPrimitive.Trigger>
  </div>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-xl border border-gray-100 dark:border-[#27273a] bg-white dark:bg-[#161622] shadow-card",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      position="popper"
      sideOffset={4}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer items-center rounded-lg py-2 pl-8 pr-3 text-sm text-gray-800 dark:text-gray-200",
      "hover:bg-primary-50 dark:hover:bg-primary-500/10 focus:bg-primary-50 dark:focus:bg-primary-500/10 focus:outline-none transition-colors",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2.5">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-primary-600" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
