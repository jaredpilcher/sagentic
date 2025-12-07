import React from 'react'

interface StatsGridProps {
    data: Record<string, unknown>
}

export function StatsGrid({ data }: StatsGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl md:text-3xl font-bold text-primary">
                        {typeof value === 'number'
                            ? key.includes('rate') || key.includes('percent')
                                ? `${value.toFixed(1)}%`
                                : key.includes('cost')
                                    ? `$${value.toFixed(4)}`
                                    : key.includes('latency') || key.includes('ms')
                                        ? `${value.toFixed(0)}ms`
                                        : value.toLocaleString()
                            : String(value)}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize mt-1">
                        {key.replace(/_/g, ' ')}
                    </div>
                </div>
            ))}
        </div>
    )
}
