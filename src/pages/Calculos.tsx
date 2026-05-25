import { Box, Alert, Button, Typography } from "@mui/material";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { isYearColumn } from "../utils/cleaningUtils";
import TablaDinamica from "../components/TablaDinamica";

export default function Calculos() {
  const { datos, variables, selectedVariables, isDatasetCleaned } = useApp();
  const navigate = useNavigate();

  const numericVars = useMemo(
    () =>
      variables
        .filter((v) => selectedVariables.includes(v.nombre))
        .filter((v) => v.tipo === "number" && !isYearColumn(v.nombre))
        .map((v) => v.nombre),
    [variables, selectedVariables]
  );

  const rows = useMemo(() => {
    return numericVars
      .map((col) => {
        const nums = (datos ?? [])
          .map((r) => {
            const raw = r[col];
            if (raw === null || raw === undefined || String(raw).trim() === "") return null;
            const n = Number(String(raw).replace(",", "."));
            return Number.isFinite(n) ? n : null;
          })
          .filter((n): n is number => n !== null);
        if (nums.length === 0) return null;
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
        const std = Math.sqrt(variance);
        return {
          variable: col,
          mediaAritmetica: mean.toFixed(4),
          desviacionEstandar: std.toFixed(4),
          varianza: variance.toFixed(4),
          distribucion: `${Math.min(...nums).toFixed(2)} a ${Math.max(...nums).toFixed(2)}`,
        };
      })
      .filter(Boolean);
  }, [datos, numericVars]);

  if (!isDatasetCleaned) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Primero ejecuta limpieza automática o manual.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/Limpieza")}>
          Ir a Limpieza
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, minHeight: "100vh", bgcolor: "#f7f9fb" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
        Cálculos
      </Typography>
      {rows.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No aplica: no hay variables numéricas válidas para cálculos (columnas de año excluidas).
        </Alert>
      ) : (
        <TablaDinamica
          datos={rows as any[]}
          columnas={["variable", "mediaAritmetica", "desviacionEstandar", "varianza", "distribucion"]}
          titulo="Resultados automáticos"
          maxRegistros={200}
        />
      )}

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={() => navigate("/Graficos")}>
          Ir a Gráficos
        </Button>
      </Box>
    </Box>
  );
}


