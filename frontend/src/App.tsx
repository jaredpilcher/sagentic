
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import RunDetail from './pages/RunDetail'
import Generations from './pages/Generations'
import Prompts from './pages/Prompts'
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/generations" element={<Generations />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="/runs/:runId" element={<RunDetail />} />
      </Routes>
    </Layout>
  )
}

export default App
