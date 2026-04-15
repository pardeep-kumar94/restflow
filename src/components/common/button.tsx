"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

const variants = {
  primary: {
    backgroundColor: "var(--accent-green)",
    color: "var(--bg-primary)",
    border: "none",
  },
  secondary: {
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid transparent",
  },
} as const;

export function Button({
  variant = "secondary",
  size = "sm",
  className = "",
  style,
  disabled,
  ...props
}: ButtonProps) {
  const padding = size === "sm" ? "px-3 py-1.5" : "px-4 py-2";
  return (
    <button
      className={`${padding} text-xs rounded-md font-semibold cursor-pointer transition-all ${className}`}
      style={{
        ...variants[variant],
        ...style,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: "0.01em",
      }}
      disabled={disabled}
      {...props}
    />
  );
}
