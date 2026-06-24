import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ---------- RetroWindow ---------- */

interface RetroWindowProps {
  title: string;
  children: ReactNode;
  className?: string;
  showControls?: boolean;
  onClose?: () => void;
}

export function RetroWindow({
  title,
  children,
  className,
  showControls = true,
  onClose,
}: RetroWindowProps) {
  return (
    <div className={cn("win95-window", className)}>
      <div className="win95-titlebar">
        <span className="font-bold text-win95-12 truncate pl-1">{title}</span>
        {showControls && (
          <div className="flex gap-[2px]">
            <button type="button" className="win95-control-btn" aria-label="Minimize">
              _
            </button>
            <button type="button" className="win95-control-btn" aria-label="Maximize">
              □
            </button>
            <button
              type="button"
              className="win95-control-btn"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ---------- RetroButton ---------- */

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary";
}

export function RetroButton({
  variant = "default",
  className,
  children,
  disabled,
  ...rest
}: RetroButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      className={cn(
        "win95-raised inline-flex items-center justify-center px-3 py-1 text-win95-12 cursor-pointer select-none active:win95-pressed",
        variant === "primary" && "font-bold",
        disabled && "text-[color:var(--win95-gray-dark)] cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- RetroInput ---------- */

type RetroInputProps = InputHTMLAttributes<HTMLInputElement>;

export function RetroInput({ className, ...rest }: RetroInputProps) {
  return (
    <input
      {...rest}
      className={cn(
        "win95-inset px-2 py-1 text-win95-12 font-system text-black bg-white outline-none w-full",
        className,
      )}
    />
  );
}

/* ---------- RetroProgress ---------- */

interface RetroProgressProps {
  value: number; // 0-100
  showLabel?: boolean;
}

export function RetroProgress({ value, showLabel }: RetroProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  // Win95 progress bars used segmented blue chunks
  const segments = 20;
  const filled = Math.round((pct / 100) * segments);
  return (
    <div className="space-y-1">
      <div className="win95-inset h-5 p-[2px] flex gap-[2px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-full"
            style={{
              background:
                i < filled ? "var(--win95-blue)" : "transparent",
            }}
          />
        ))}
      </div>
      {showLabel && (
        <div className="text-win95-11 text-center font-bold">{pct}%</div>
      )}
    </div>
  );
}