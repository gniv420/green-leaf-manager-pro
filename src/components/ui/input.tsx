
import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  decimalInput?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, decimalInput, ...props }, ref) => {
    // Handle decimal input for numeric fields
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!decimalInput) return;
      
      // Allow only numbers, one decimal point (either . or ,)
      const allowedChars = /[0-9.,]/;
      const key = e.key;
      const value = (e.target as HTMLInputElement).value;
      
      // Reject if not an allowed character
      if (!allowedChars.test(key)) {
        e.preventDefault();
        return;
      }
      
      // If the key is a decimal point (. or ,)
      if (key === '.' || key === ',') {
        // If the field already has a decimal point, prevent adding another
        if (value.includes('.') || value.includes(',')) {
          e.preventDefault();
        }
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
        onKeyDown={decimalInput ? handleKeyPress : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
