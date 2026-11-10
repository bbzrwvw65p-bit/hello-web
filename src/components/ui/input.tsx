import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-14 w-full rounded-2xl border border-line bg-card px-4 text-2xl tabular-nums outline-none placeholder:text-mute/70 focus:border-ink",
        className,
      )}
      {...props}
    />
  );
}
