import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  return <Loader2 className={cn(sizes[size], "animate-spin", className)} />;
}

interface LoadingOverlayProps {
  message: string;
  submessage?: string;
}

export function LoadingOverlay({ message, submessage }: LoadingOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 animate-pulse" />
        </div>
        <Spinner size="lg" className="text-blue-400" />
      </div>
      <p className="text-base font-semibold text-white mb-1">{message}</p>
      {submessage && <p className="text-sm text-slate-400">{submessage}</p>}
    </div>
  );
}
