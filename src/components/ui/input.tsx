
import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  decimalInput?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, decimalInput, ...props }, ref) => {
    // Handle decimal input for numeric fields
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!decimalInput) return;
      
      // Only prevent if it's not a number, decimal point, or control key
      const allowedKeys = /^[0-9.,]$/;
      const controlKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Home", "End"];
      
      if (!allowedKeys.test(e.key) && !controlKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    };
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        onKeyDown={decimalInput ? handleKeyDown : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
