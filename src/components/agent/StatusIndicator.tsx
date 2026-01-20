import { cn } from "@/lib/utils";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const colors = {
    connected: "bg-green-500",
    connecting: "bg-yellow-500",
    disconnected: "bg-red-500",
  };

  const labels = {
    connected: "Live",
    connecting: "Connecting...",
    disconnected: "Offline",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-full animate-pulse", colors[status])} />
      <span className="text-sm font-medium text-gray-300">
        {labels[status]}
      </span>
    </div>
  );
}
