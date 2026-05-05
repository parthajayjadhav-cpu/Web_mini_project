import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Join from './pages/Join.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Join />} />
          <Route path="/sprint/:code" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
