import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Divider,
} from "@mui/material";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import BarChartIcon from "@mui/icons-material/BarChart";
import DescriptionIcon from "@mui/icons-material/Description";
import banner_centralData  from "../assets/banner-centralData.png"
import { useNavigate } from "react-router-dom";




const actions = [
  { label: "Cargar Datos", path: "/", icon: <UploadFileIcon /> },
  { label: "Limpieza", path: "/Limpieza", icon: <AutoFixHighIcon /> },
  { label: "Gráficos", path: "/Graficos", icon: <BarChartIcon /> },
  { label: "Reportes", path: "/Reportes", icon: <DescriptionIcon /> },
];
export default function Dashboard() {

    const navigate = useNavigate();
  return (
    <Box
  sx={{
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: "#F7F9FB",
    }}
>
  <Box sx={{ width: "100%", maxWidth: 1200 }}>
    
        <Typography
      variant="h4"
      sx={{
        fontWeight: 800,
        textAlign: "center",
        fontSize:55,
        mb: 8,
      }}
    >
      Gestión y Análisis Predictivo de datos
    </Typography>

    <Grid container>
      
      <Grid size={{ xs: 12, md: 5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {actions.map((item) => (
            <Button
             onClick={() => navigate("/CargarDatos")}
              key={item.label}
              startIcon={item.icon}
              fullWidth
              sx={{
                justifyContent: "flex-start",
                gap: 2,
                px: 3,
                py: 2,
                borderRadius: "16px",
                bgcolor: "#ffff",
                color: "#000",
                textTransform: "none",
                fontWeight: 500,

                "&:hover": {
                  bgcolor: "#d1d5db",
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Grid>

      <Grid
        size={{ md: 1 }}
        sx={{
          display: { xs: "none", md: "flex" },
          justifyContent: "center",
        }}
      >
        <Divider orientation="vertical" flexItem />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              maxWidth: 420,
              height: 420,
              borderRadius: "32px",
              bgcolor: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box component={"img"} src={banner_centralData} sx={{width:350}}/>
          </Paper>
        </Box>
      </Grid>

    </Grid>
  </Box>
</Box>
  );
}