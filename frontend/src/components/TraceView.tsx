
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

interface Span {
    span_id: string
    trace_id: string
    parent_id: string | null
    name: string
    start_time: string
    end_time: string | null
    span_kind: 'AGENT' | 'LLM' | 'TOOL' | 'CHAIN'
    attributes: any
    status_code: 'OK' | 'ERROR'
}

interface TraceViewProps {
    spans: Span[]
}

export default function TraceView({ spans }: TraceViewProps) {
    // 1. Calculate relative timings
    const { minTime, duration } = useMemo(() => {
        if (spans.length === 0) return { minTime: 0, maxTime: 0, duration: 0 }

        const times = spans.flatMap(s => [
            new Date(s.start_time).getTime(),
            s.end_time ? new Date(s.end_time).getTime() : new Date(s.start_time).getTime()
        ])

        const min = Math.min(...times)
        const max = Math.max(...times)

        return { minTime: min, duration: max - min }
    }, [spans])

    // 2. Build tree structure (flat list with depth for rendering)
    const processedSpans = useMemo(() => {
        const map = new Map<string, Span & { children: string[], depth: number }>()
        spans.forEach(s => map.set(s.span_id, { ...s, children: [], depth: 0 }))

        const roots: string[] = []

        spans.forEach(s => {
            if (s.parent_id && map.has(s.parent_id)) {
                map.get(s.parent_id)!.children.push(s.span_id)
            } else {
                roots.push(s.span_id)
            }
        })

        const result: (Span & { depth: number })[] = []

        function traverse(id: string, depth: number) {
            const node = map.get(id)!
            node.depth = depth
            result.push(node)
            node.children.forEach(childId => traverse(childId, depth + 1))
        }

        roots.forEach(id => traverse(id, 0))
        return result
    }, [spans])

    if (spans.length === 0) return <div className="p-8 text-center text-muted-foreground">No trace data available.</div>

    return (
        <div className="space-y-1">
            <div className="flex text-xs text-muted-foreground border-b border-border pb-2 mb-2">
                <div className="w-64 pl-4">Span Name</div>
                <div className="flex-1 relative h-4">
                    <span className="absolute left-0">0ms</span>
                    <span className="absolute right-0">{duration}ms</span>
                </div>
            </div>

            {processedSpans.map((span) => {
                const start = new Date(span.start_time).getTime()
                const end = span.end_time ? new Date(span.end_time).getTime() : start
                const spanDuration = end - start

                const leftPct = ((start - minTime) / duration) * 100
                const widthPct = Math.max(((spanDuration) / duration) * 100, 0.5) // Min width for visibility

                return (
                    <div key={span.span_id} className="flex items-center group hover:bg-accent/50 rounded py-1 transition-colors">
                        <div className="w-64 pl-4 pr-4 flex items-center gap-2 overflow-hidden">
                            <div style={{ width: span.depth * 16 }} className="flex-shrink-0" />
                            <div className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                span.span_kind === 'AGENT' && "bg-purple-500",
                                span.span_kind === 'LLM' && "bg-green-500",
                                span.span_kind === 'TOOL' && "bg-blue-500",
                                span.span_kind === 'CHAIN' && "bg-orange-500",
                            )} />
                            <span className="text-sm truncate font-mono" title={span.name}>{span.name}</span>
                        </div>

                        <div className="flex-1 relative h-6 mx-4">
                            <motion.div
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                transition={{ duration: 0.3 }}
                                className={cn(
                                    "absolute h-full rounded opacity-80 border border-white/10",
                                    span.span_kind === 'AGENT' && "bg-purple-500/20 border-purple-500/50",
                                    span.span_kind === 'LLM' && "bg-green-500/20 border-green-500/50",
                                    span.span_kind === 'TOOL' && "bg-blue-500/20 border-blue-500/50",
                                    span.span_kind === 'CHAIN' && "bg-orange-500/20 border-orange-500/50",
                                    span.status_code === 'ERROR' && "bg-red-500/20 border-red-500/50"
                                )}
                                style={{
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                    transformOrigin: 'left'
                                }}
                            >
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded border border-border shadow-lg whitespace-nowrap z-10 pointer-events-none">
                                    {spanDuration}ms
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
