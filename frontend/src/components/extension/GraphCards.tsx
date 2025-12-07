import React from 'react'

interface GraphCardsProps {
    data: Array<Record<string, unknown>>
}

export function GraphCards({ data }: GraphCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((card, i) => (
                <div key={i} className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="font-medium mb-2 truncate">
                        {String(card.graph_id || card.title || card.name || `Item ${i + 1}`)}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(card)
                            .filter(([k]) => !['graph_id', 'title', 'name', 'id'].includes(k))
                            .map(([key, value]) => (
                                <div key={key}>
                                    <div className="text-muted-foreground capitalize text-xs">{key.replace(/_/g, ' ')}</div>
                                    <div className="font-medium">
                                        {typeof value === 'number'
                                            ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                            : String(value)}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
