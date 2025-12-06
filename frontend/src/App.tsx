import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import RunDetail from './pages/RunDetail'
import Evaluations from './pages/Evaluations'
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/runs/:runId" element={<RunDetail />} />
        <Route path="/evaluations" element={<Evaluations />} />
      </Routes>
    </Layout>
  )
}

export default App
