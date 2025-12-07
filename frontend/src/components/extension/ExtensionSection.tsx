// React unused

import { StatsGrid } from './StatsGrid'
import { DataTable } from './DataTable'
import { GraphCards } from './GraphCards'

interface SectionData {
    id: string
    title: string
    type: 'stats' | 'table' | 'list' | 'cards' | 'custom'
    data: unknown
}

interface ExtensionSectionProps {
    section: SectionData
}

export function ExtensionSection({ section }: ExtensionSectionProps) {
    const renderContent = () => {
        switch (section.type) {
            case 'stats':
                return <StatsGrid data={section.data as Record<string, unknown>} />
            case 'table':
                return <DataTable data={section.data as Array<Record<string, unknown>>} />
            case 'cards':
                return <GraphCards data={section.data as Array<Record<string, unknown>>} />
            case 'list':
                return (
                    <ul className="space-y-2">
                        {(section.data as Array<unknown>).map((item, i) => (
                            <li key={i} className="p-3 bg-muted/30 rounded-lg">
                                {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                            </li>
                        ))}
                    </ul>
                )
            case 'custom':
                if (typeof section.data === 'string') {
                    return <div dangerouslySetInnerHTML={{ __html: section.data }} />
                }
                return <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-auto">{JSON.stringify(section.data, null, 2)}</pre>
            default:
                return null
        }
    }

    return (
        <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
            {renderContent()}
        </div>
    )
}
