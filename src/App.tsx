import AppRoutes from "./routes/AppRoutes"
import { AppProvider } from "./context/AppContext"



function App() {

  return (
    
      <>
      <AppProvider>
        <AppRoutes/>
      </AppProvider>
      
      
      </>
  )
}

export default App
