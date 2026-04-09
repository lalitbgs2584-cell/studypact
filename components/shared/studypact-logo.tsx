import { cn } from "@/lib/utils";

type StudyPactMarkProps = {
  className?: string;
};

type StudyPactLogoProps = {
  className?: string;
  labelClassName?: string;
  markClassName?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
};

const sizeStyles = {
  sm: {
    shell: "h-10 w-10 rounded-xl",
    mark: "h-5 w-5",
    label: "text-xl",
  },
  md: {
    shell: "h-12 w-12 rounded-2xl",
    mark: "h-6 w-6",
    label: "text-2xl",
  },
} as const;

export function StudyPactMark({ className }: StudyPactMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <g transform="rotate(-35 22 32)">
        <rect
          x="8"
          y="20"
          width="28"
          height="24"
          rx="12"
          stroke="currentColor"
          strokeWidth="4.5"
        />
      </g>
      <g transform="rotate(-35 42 32)" opacity="0.78">
        <rect
          x="28"
          y="20"
          width="28"
          height="24"
          rx="12"
          stroke="currentColor"
          strokeWidth="4.5"
        />
      </g>
      <path
        d="M24 34.5L30 40.5L40.5 28.5"
        stroke="#34d399"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StudyPactLogo({
  className,
  labelClassName,
  markClassName,
  showLabel = true,
  size = "sm",
}: StudyPactLogoProps) {
  const styles = sizeStyles[size];

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center border border-white/10 bg-white/5 text-white shadow-lg",
          styles.shell,
        )}
      >
        <StudyPactMark className={cn(styles.mark, markClassName)} />
      </span>
      {showLabel ? (
        <span
          className={cn(
            "font-bold tracking-tight text-white",
            styles.label,
            labelClassName,
          )}
        >
          StudyPact
        </span>
      ) : null}
    </span>
  );
}
