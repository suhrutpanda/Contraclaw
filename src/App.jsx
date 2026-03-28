import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ContractDetail from './pages/ContractDetail'
import InboxMonitor from './pages/InboxMonitor'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />`n        <Route path="/inbox" element={<InboxMonitor />} />
        <Route path="/contracts/:id" element={<ContractDetail />} />
      </Routes>
    </Layout>
  )
}

export default App
