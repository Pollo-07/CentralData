import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
} from "@mui/material";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { analyzeDataset, applyImputation } from "../utils/cleaningUtils";
import SummaryCards from "../components/SummaryCards";
import CleaningReportTable from "../components/CleaningReportTable";
import DatasetPreview from "../components/DatasetPreview";

export default function Limpieza() {
  const navigate = useNavigate();
  const {
    datos,
    variables,
    selectedVariables,
    setDatos,
    originalDatos,
    setOriginalDatos,
    markDatasetCleaned,
  } = useApp();

  const stats = useMemo(() => {
    const selected = variables.filter((v) => selectedVariables.includes(v.nombre));
    return analyzeDataset(datos, selected);
  }, [datos, variables, selectedVariables]);

  const [actions, setActions] = useState<any>({});
  const [cleanedData, setCleanedData] = useState<any[]>([]);
  const [createBackup, setCreateBackup] = useState<boolean>(true);

  useEffect(() => {
    const initial: any = {};
    stats.forEach((col) => {
      initial[col.nombre] = { method: col.suggestedMethod, applied: false };
    });
    setActions(initial);
  }, [stats]);

  const columnsWithNulls = stats.filter((c) => c.nullCount > 0);

  const handleApply = (colName: string) => {
    const column = stats.find((c) => c.nombre === colName);
    if (!column) return;

    const sourceData = cleanedData.length ? cleanedData : datos;

    if (createBackup && !originalDatos) {
      setOriginalDatos(sourceData.map((r) => ({ ...r })));
    }

    const updated = applyImputation(sourceData, column, actions[colName].method, { normalizeText: true });
    setCleanedData(updated);
    setDatos(updated);
    markDatasetCleaned();

    setActions((prev: any) => ({
      ...prev,
      [colName]: {
        ...prev[colName],
        applied: true,
      },
    }));
  };

  const handleAutoClean = () => {
    const sourceData = cleanedData.length ? cleanedData : datos;

    if (createBackup && !originalDatos) {
      setOriginalDatos(sourceData.map((r) => ({ ...r })));
    }

    let updated = sourceData.map((row) => {
      const normalized: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        const value = row[k];
        if (typeof value === "string") normalized[k] = value.trim().toLowerCase();
        else normalized[k] = value;
      });
      return normalized;
    });

    columnsWithNulls.forEach((col) => {
      const method = actions[col.nombre]?.method ?? col.suggestedMethod;
      updated = applyImputation(updated, col, method, { normalizeText: true });
    });

    if (columnsWithNulls.length === 0) {
      updated = applyImputation(
        updated,
        {
          nombre: "",
          tipo: "string",
          total: updated.length,
          nullCount: 0,
          nullPercent: 0,
          duplicateCount: 0,
          duplicatePercent: 0,
          suggestedMethod: "ignore",
        },
        "ignore",
        { normalizeText: true }
      );
    }

    setCleanedData(updated);
    setDatos(updated);
    markDatasetCleaned();

    setActions((prev: any) => {
      const next = { ...prev };
      columnsWithNulls.forEach((col) => {
        next[col.nombre] = {
          ...next[col.nombre],
          applied: true,
        };
      });
      return next;
    });

    navigate("/Calculos");
  };

  const handleContinueManual = () => {
    const result = cleanedData.length > 0 ? cleanedData : datos;
    setDatos(result);
    navigate("/LimpiezaTipos");
  };

  if (!datos || datos.length === 0) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#f8fafc",
          p: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 500,
            width: "100%",
            borderRadius: 4,
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            textAlign: "center",
            p: 3,
          }}
        >
          <CardContent>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#0f172a" }}>
              No hay datos cargados
            </Typography>

            <Typography sx={{ color: "#64748b", mb: 3 }}>
              Debes cargar un dataset antes de realizar el proceso de limpieza.
            </Typography>

            <Button
              variant="contained"
              onClick={() => navigate("/CargarDatos")}
              sx={{
                bgcolor: "#4338ca",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                "&:hover": {
                  bgcolor: "#312e81",
                },
              }}
            >
              Ir a cargar datos
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, minHeight: "100vh", bgcolor: "#ffffff" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, color: "#0f172a" }}>
        Limpieza de Datos
      </Typography>

      <SummaryCards
        stats={{
          totalColumns: stats.length,
          columnsWithNulls: columnsWithNulls.length,
          totalNulls: columnsWithNulls.reduce((acc, c) => acc + c.nullCount, 0),
          cleanColumns: stats.length - columnsWithNulls.length,
        }}
      />

      <Box sx={{ mt: 3 }}>
        <FormControlLabel
          control={<Checkbox checked={createBackup} onChange={(e) => setCreateBackup(e.target.checked)} />}
          label="Crear copia del dataset original antes de aplicar cambios"
        />
      </Box>

      {originalDatos && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Existe una copia del dataset original en memoria para comparacion/restauracion.
        </Alert>
      )}

      <Box sx={{ mt: 4 }}>
        <CleaningReportTable columns={columnsWithNulls} actions={actions} onApply={handleApply} />
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Vista previa
        </Typography>

        <DatasetPreview data={cleanedData.length ? cleanedData : datos} columns={selectedVariables} />
      </Box>

      <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="contained" color="success" onClick={handleAutoClean}>
          Limpieza automatica
        </Button>
        <Button variant="contained" onClick={handleContinueManual} sx={{ bgcolor: "#4338ca" }}>
          Continuar
        </Button>
      </Box>

    </Box>
  );
}
