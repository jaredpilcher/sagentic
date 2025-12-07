import RunsList from '../components/RunsList'

export default function Runs() {
    return (
        <RunsList 
            showGraphFilter={true}
            showTitle={true}
            title="All Runs"
            subtitle="Browse and filter your workflow execution history."
            showStatePreview={true}
        />
    )
}
