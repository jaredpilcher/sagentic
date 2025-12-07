import React from 'react'
import { formatValue } from '../../lib/formatUtils'

interface StatsGridProps {
    data: Record<string, unknown>
}

export function StatsGrid({ data }: StatsGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl md:text-3xl font-bold text-primary">
                        {formatValue(key, value)}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize mt-1">
                        {key.replace(/_/g, ' ')}
                    </div>
                </div>
            ))}
        </div>
    )
}
