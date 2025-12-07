import type { LucideIcon } from 'lucide-react'

interface MetricWidgetProps {
    title: string
    value: string | number
    icon: LucideIcon
    color?: string
}

export default function MetricWidget({ title, value, icon: Icon, color }: MetricWidgetProps) {
    return (
        <div className="h-full flex flex-col justify-between p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{title}</span>
                <Icon className={`w-4 h-4 ${color || 'text-muted-foreground'}`} />
            </div>
            <div className="text-2xl font-bold truncate">{value}</div>
        </div>
    )
}
