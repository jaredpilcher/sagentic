export function formatValue(key: string, value: unknown): string {
    if (typeof value === 'number') {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('rate') || lowerKey.includes('percent')) {
            return `${value.toFixed(1)}%`;
        }
        if (lowerKey.includes('cost')) {
            return `$${value.toFixed(4)}`;
        }
        if (lowerKey.includes('latency') || lowerKey.includes('ms')) {
            return `${value.toFixed(0)}ms`;
        }
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(value);
}
