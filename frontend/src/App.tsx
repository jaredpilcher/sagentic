import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Runs from './pages/Runs'
import RunDetail from './pages/RunDetail'
import Agents from './pages/Agents'
import AgentDetail from './pages/AgentDetail'
import Evaluations from './pages/Evaluations'
import Extensions from './pages/Extensions'
import ExtensionPanel from './pages/ExtensionPanel'
import Layout from './components/Layout'
import ExtensionModal from './components/ExtensionModal'
import { ExtensionRegistryProvider, ExtensionModalProvider } from './lib/extensions'

function App() {
  return (
    <ExtensionRegistryProvider>
      <ExtensionModalProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/:graphId" element={<AgentDetail />} />
            <Route path="/runs" element={<Runs />} />
            <Route path="/runs/:runId" element={<RunDetail />} />
            <Route path="/evaluations" element={<Evaluations />} />
            <Route path="/extensions" element={<Extensions />} />
            <Route path="/extensions/:extensionName" element={<ExtensionPanel />} />
            <Route path="/extensions/:extensionName/*" element={<ExtensionPanel />} />
          </Routes>
        </Layout>
        <ExtensionModal />
      </ExtensionModalProvider>
    </ExtensionRegistryProvider>
  )
}

export default App
