import { Box, Tab, Tabs, } from '@mui/material'
import { useState } from 'react'
import CargarDatosExcel from '../components/CargarDatosExcel'
import CargarDatosApi from '../components/CargarDatosApi'


const CargarDatos = () => {
    const [datos,SetDato] = useState<boolean>(false)
    const handlerDatos =()=>{
        SetDato((item)=>!item)
    }
      

  return (
    <Box sx={{bgcolor: "#f7f9fb",p:4}}>


        <Tabs value={datos?1:0} sx={{ mb: 3 }}>
          <Tab  onClick ={handlerDatos } label="Cargar archivo" />
          <Tab onClick ={handlerDatos } label="Conexión API" />
        </Tabs>
            <div style={{ display: datos ? "none" : "block" }}>
            <CargarDatosExcel />
            </div>

        <div style={{ display: datos ? "block" : "none" }}>
        <CargarDatosApi />
        </div>
        
      
    </Box>
  )
}

export default CargarDatos
