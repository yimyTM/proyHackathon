import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"

type LoteEstado = "APTO" | "OBSERVADO" | "NO_APTO"

interface StatusBadgeProps {
  estado: LoteEstado
  showIcon?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const estadoConfig = {
  APTO: {
    label: "APTO",
    icon: CheckCircle2,
    className: "bg-[oklch(0.62_0.17_160)] text-white hover:bg-[oklch(0.55_0.17_160)]",
  },
  OBSERVADO: {
    label: "OBSERVADO",
    icon: AlertTriangle,
    className: "bg-[oklch(0.75_0.15_85)] text-[oklch(0.3_0.1_85)] hover:bg-[oklch(0.7_0.15_85)]",
  },
  NO_APTO: {
    label: "NO APTO",
    icon: XCircle,
    className: "bg-[oklch(0.55_0.22_25)] text-white hover:bg-[oklch(0.5_0.22_25)]",
  },
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
}

export function StatusBadge({
  estado,
  showIcon = true,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = estadoConfig[estado]
  const Icon = config.icon

  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold border-0",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(
        size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"
      )} />}
      {config.label}
    </Badge>
  )
}
