import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router'
import { AuthProvider } from './hooks/useAuth'
import { AppContainer } from './components/AppContainer'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContainer>
          <AppRouter />
        </AppContainer>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
