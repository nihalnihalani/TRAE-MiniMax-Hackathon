import { cn } from "@/lib/utils";

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "disconnecting";

export function StatusIndicator({ status }: { status: ConnectionStatus | string }) {
  const colors: Record<string, string> = {
    connected: "bg-green-500",
    connecting: "bg-yellow-500",
    disconnected: "bg-red-500",
    disconnecting: "bg-orange-500",
  };

  const labels: Record<string, string> = {
    connected: "Live",
    connecting: "Connecting...",
    disconnected: "Offline",
    disconnecting: "Disconnecting...",
  };

  const color = colors[status] || "bg-gray-500";
  const label = labels[status] || status;

  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-full animate-pulse", color)} />
      <span className="text-sm font-medium text-gray-300">
        {label}
      </span>
    </div>
  );
}
