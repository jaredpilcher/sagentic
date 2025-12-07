import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Runs from './pages/Runs'
import RunDetail from './pages/RunDetail'
import Evaluations from './pages/Evaluations'
import Extensions from './pages/Extensions'
import ExtensionPanel from './pages/ExtensionPanel'
import Layout from './components/Layout'
import { ExtensionProvider } from './lib/extensions'

function App() {
  return (
    <ExtensionProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/:runId" element={<RunDetail />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/extensions" element={<Extensions />} />
          <Route path="/extensions/:extensionName" element={<ExtensionPanel />} />
        </Routes>
      </Layout>
    </ExtensionProvider>
  )
}

export default App
