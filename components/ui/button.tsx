import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

    const variants = {
      default: "bg-whiskey-amber text-white hover:bg-whiskey-light active:scale-95",
      outline: "border-2 border-whiskey-amber text-whiskey-amber bg-transparent hover:bg-whiskey-amber/10",
      ghost: "text-whiskey-amber hover:bg-whiskey-amber/10"
    }

    const sizes = {
      default: "h-12 px-8 py-3",
      sm: "h-9 px-4 text-sm",
      lg: "h-14 px-10 text-lg"
    }

    return (
      <button
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
