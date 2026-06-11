import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Predict from './pages/Predict'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/predict" element={<Predict />} />
    </Routes>
  )
}
