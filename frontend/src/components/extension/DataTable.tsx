import React from 'react'

interface DataTableProps {
    data: Array<Record<string, unknown>>
}

export function DataTable({ data }: DataTableProps) {
    if (!data.length) return <p className="text-muted-foreground">No data available</p>
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        {Object.keys(data[0]).map(key => (
                            <th key={key} className="text-left py-2 px-3 font-medium text-muted-foreground capitalize">
                                {key.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                            {Object.values(row).map((value, j) => (
                                <td key={j} className="py-2 px-3">
                                    {typeof value === 'number'
                                        ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                        : String(value)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
