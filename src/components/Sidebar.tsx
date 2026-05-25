import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import BarChartIcon from "@mui/icons-material/BarChart";
import DescriptionIcon from "@mui/icons-material/Description";
import logo from "../assets/logo-centralData.png"


const actions = [
  { label: "Cargar Datos", path: "/CargarDatos", icon: <UploadFileIcon /> },
  { label: "Limpieza", path: "/Limpieza", icon: <AutoFixHighIcon /> },
  { label: "Gráficos", path: "/Graficos", icon: <BarChartIcon /> },
  { label: "Reportes", path: "/Reportes", icon: <DescriptionIcon /> },
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: 250,
        overflow:"hidden",
        bgcolor: "#fff",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        gap: 2,
     
      }}
    >

      <Box sx={{width:"100%",height:200,p:1, borderBottom:"1px solid rgba(232, 224, 224, 0.8) ",}}>
            <Box component={"img"}   onClick={() => navigate("/CargarDatos")} src={logo} sx={{borderRadius:"50%"
        ,width:265,height:180,cursor:"pointer"}}/>
      </Box>
     
      
      <Box sx={{mt:2,display:"flex",flexDirection:"column",gap:3,cursor:"pointer",paddingBottom:10,borderBottom:"1px solid rgba(232, 224, 224, 0.8) ",}}>
         {actions.map((item) => (
        <Box
          key={item.label}
          onClick={() => navigate(item.path)}
          sx={{
            display:"flex",
            alignItems:"center",
            gap:1,
            justifyContent: "flex-start",
            textTransform: "none",
            color: "#000",
            px: 4,
            py: 1.5,

            "&:hover": {
              bgcolor: "#f0f2f6",
            },
          }}
        >
         <Typography variant="h6" sx={{}}> {item.label}</Typography>
          {item.icon}
        </Box>
      ))}

      </Box>
     
    </Box>
  );
}