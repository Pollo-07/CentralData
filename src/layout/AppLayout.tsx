import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AppLayout() {
  return (
    <Box sx={{ display: "flex", height: "100vh",overflow: "hidden"  }}>
      
      <Sidebar />

      <Box  id="main-scroll" sx={{flex: 1,bgcolor: "#f3f4f6", overflow: "auto",
            minHeight: 0,}}
      >
        <Outlet />
      </Box>

    </Box>
  );
}