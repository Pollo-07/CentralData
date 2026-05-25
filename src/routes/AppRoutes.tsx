import AppLayout from '../layout/AppLayout'
import { Route, Routes } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import Liempieza from '../pages/Liempieza'
import Graficos from '../pages/Graficos'
import Reportes from '../pages/Reportes'
import CargarDatos from '../pages/CargarDatos'
import LimpiezaTipos from '../components/LiempezaTipo'
import Calculos from '../pages/Calculos'


const AppRoutes = () => {
  return (
  <Routes>
    <Route path="/" element={<Dashboard/>} />
    <Route element={<AppLayout/>} >
       <Route  index path="/CargarDatos" element={<CargarDatos/>} />
        <Route path="/LimpiezaTipos" element={<LimpiezaTipos/>} />
         <Route path="/Limpieza" element={<Liempieza/>} />
        <Route path="/Calculos" element={<Calculos/>} />
        <Route path="/Graficos" element={<Graficos/>} />
        <Route path="/Reportes" element={<Reportes/>} />
    </Route>
    
  </Routes>
  )
}

export default AppRoutes
