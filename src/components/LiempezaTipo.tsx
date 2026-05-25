import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Alert,
  LinearProgress,
  Tooltip,
  Collapse,
  Divider,
} from "@mui/material";
// import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
// import WarningAmberIcon from "@mui/icons-material/WarningAmber";
// import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DataObjectIcon from "@mui/icons-material/DataObject";
import { useApp } from "../context/AppContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type CorrectionAction = "cast" | "delete_row" | "ignore";

interface ErrorDetail {
  rowIndex: number;
  originalValue: any;
  errorReason: string;
}

interface ColumnTypeReport {
  nombre: string;
  declaredType: string;
  total: number;
  errorCount: number;
  errorPercent: number;
  errorDetails: ErrorDetail[];
  suggestedFormat: string;
  suggestedAction: CorrectionAction;
  castPreview: string;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const DATE_FORMATS = [
  { regex: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z?)?$/, label: "ISO 8601 (YYYY-MM-DD)" },
  { regex: /^\d{2}\/\d{2}\/\d{4}$/, label: "DD/MM/YYYY" },
  { regex: /^\d{2}-\d{2}-\d{4}$/, label: "DD-MM-YYYY" },
  { regex: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, label: "M/D/YY" },
  { regex: /^\d{4}\/\d{2}\/\d{2}$/, label: "YYYY/MM/DD" },
];

function detectDateFormat(value: string): string | null {
  for (const fmt of DATE_FORMATS) {
    if (fmt.regex.test(value.trim())) return fmt.label;
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return "Fecha parseable";
  return null;
}

function validateNumber(value: any): { ok: boolean; parsed?: number; reason?: string } {
  if (typeof value === "number") return { ok: true, parsed: value };
  if (typeof value === "boolean") return { ok: false, reason: "Booleano en columna numérica" };
  const str = String(value).trim().replace(",", ".");
  const num = Number(str);
  if (!isNaN(num) && str !== "") return { ok: true, parsed: num };
  return { ok: false, reason: `"${value}" no es un número válido` };
}

function validateDate(value: any): { ok: boolean; parsed?: string; reason?: string } {
  if (typeof value === "number") {
    const d = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return { ok: true, parsed: d.toISOString().split("T")[0] };
    return { ok: false, reason: `Serial numérico no reconocido: ${value}` };
  }
  const str = String(value).trim();
  const fmt = detectDateFormat(str);
  if (fmt) {
    const d = new Date(str);
    return { ok: true, parsed: isNaN(d.getTime()) ? str : d.toISOString().split("T")[0] };
  }
  return { ok: false, reason: `"${value}" no coincide con ningún formato de fecha` };
}

function validateBoolean(value: any): { ok: boolean; parsed?: boolean; reason?: string } {
  if (typeof value === "boolean") return { ok: true, parsed: value };
  const str = String(value).trim().toLowerCase();
  if (["true", "false", "1", "0", "yes", "no", "sí", "si"].includes(str))
    return { ok: true, parsed: ["true", "1", "yes", "sí", "si"].includes(str) };
  return { ok: false, reason: `"${value}" no representa un booleano` };
}

function runValidation(
  value: any,
  type: string
): { ok: boolean; parsed?: any; reason?: string } {
  if (value === null || value === undefined || String(value).trim() === "") return { ok: true };
  switch (type) {
    case "number": return validateNumber(value);
    case "date": return validateDate(value);
    case "boolean": return validateBoolean(value);
    default: return { ok: true };
  }
}

// ─── Analysis ────────────────────────────────────────────────────────────────

function analyzeTypes(
  data: any[],
  variables: { nombre: string; tipo: string }[]
): ColumnTypeReport[] {
  const reports: ColumnTypeReport[] = [];

  for (const variable of variables) {
    const errors: ErrorDetail[] = [];
    let castExample: { from: any; to: any } | null = null;

    for (let i = 0; i < data.length; i++) {
      const raw = data[i][variable.nombre];
      const result = runValidation(raw, variable.tipo);
      if (!result.ok) {
        errors.push({ rowIndex: i, originalValue: raw, errorReason: result.reason ?? "Tipo incorrecto" });
      } else if (!castExample && result.parsed !== undefined && result.parsed !== raw) {
        castExample = { from: raw, to: result.parsed };
      }
    }

    if (errors.length === 0) continue;

    const errorPercent = (errors.length / data.length) * 100;

    let suggestedFormat = "";
    let castPreview = "";
    const suggestedAction: CorrectionAction = errorPercent > 40 ? "delete_row" : "cast";

    switch (variable.tipo) {
      case "number":
        suggestedFormat = "Numérico (float/int) — eliminar texto no numérico";
        castPreview = castExample ? `"${castExample.from}" → ${castExample.to}` : '"3,14" → 3.14';
        break;
      case "date":
        suggestedFormat = "ISO 8601: YYYY-MM-DD";
        castPreview = castExample ? `"${castExample.from}" → "${castExample.to}"` : '"01/12/2024" → "2024-12-01"';
        break;
      case "boolean":
        suggestedFormat = "true / false (también: 1/0, yes/no, sí/no)";
        castPreview = '"yes" → true  |  "0" → false';
        break;
      default:
        suggestedFormat = "Texto (string)";
        castPreview = "Conversión a String";
    }

    reports.push({
      nombre: variable.nombre,
      declaredType: variable.tipo,
      total: data.length,
      errorCount: errors.length,
      errorPercent,
      errorDetails: errors.slice(0, 20),
      suggestedFormat,
      suggestedAction,
      castPreview,
    });
  }

  return reports;
}

function applyCorrection(data: any[], report: ColumnTypeReport, action: CorrectionAction): any[] {
  if (action === "ignore") return data;

  const errorIndexes = new Set<number>();
  data.forEach((row, i) => {
    const result = runValidation(row[report.nombre], report.declaredType);
    if (!result.ok) errorIndexes.add(i);
  });

  if (action === "delete_row") return data.filter((_, i) => !errorIndexes.has(i));

  return data.map((row, i) => {
    if (!errorIndexes.has(i)) return row;
    const raw = row[report.nombre];
    let casted: any = raw;
    switch (report.declaredType) {
      case "number": {
        const n = Number(String(raw).trim().replace(",", "."));
        casted = isNaN(n) ? null : n;
        break;
      }
      case "date": {
        const d = new Date(String(raw).trim());
        casted = isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
        break;
      }
      case "boolean": {
        const s = String(raw).trim().toLowerCase();
        casted = ["true", "1", "yes", "sí", "si"].includes(s);
        break;
      }
      default:
        casted = String(raw);
    }
    return { ...row, [report.nombre]: casted };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const palette: Record<string, { bg: string; color: string }> = {
    number:      { bg: "#dbeafe", color: "#1d4ed8" },
    string:      { bg: "#f3e8ff", color: "#7c3aed" },
    date:        { bg: "#fce7f3", color: "#be185d" },
    boolean:     { bg: "#d1fae5", color: "#065f46" },
    desconocido: { bg: "#f1f5f9", color: "#64748b" },
  };
  const c = palette[type] ?? palette.desconocido;
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", px: 1.5, py: 0.25, borderRadius: 1, bgcolor: c.bg, color: c.color, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
      {type}
    </Box>
  );
}

function ErrorsExpandable({ errors }: { errors: ErrorDetail[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Button
        size="small"
        endIcon={open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        onClick={() => setOpen((p) => !p)}
        sx={{ fontSize: 11, textTransform: "none", color: "#f59e0b", p: 0, minWidth: 0 }}
      >
        Ver {errors.length} valores erróneos
      </Button>
      <Collapse in={open}>
        <Paper variant="outlined" sx={{ mt: 1, maxHeight: 190, overflow: "auto", borderRadius: 2, borderColor: "#fde68a" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#fffbeb" }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.5 }}>Fila</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.5 }}>Valor original</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.5 }}>Razón del error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {errors.map((e, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontSize: 11, py: 0.5, color: "#64748b" }}>#{e.rowIndex + 1}</TableCell>
                  <TableCell sx={{ fontSize: 11, py: 0.5, fontFamily: "monospace", color: "#b45309", fontWeight: 600 }}>
                    {String(e.originalValue)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, py: 0.5, color: "#94a3b8" }}>{e.errorReason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Collapse>
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LimpiezaTipos() {
  const navigate = useNavigate();
  const { datos, variables, selectedVariables, setDatos, markDatasetCleaned } = useApp();

  const selectedVars = useMemo(
    () => variables.filter((v) => selectedVariables.includes(v.nombre)),
    [variables, selectedVariables]
  );

  const typeReports = useMemo<ColumnTypeReport[]>(
    () => (datos?.length ? analyzeTypes(datos, selectedVars) : []),
    [datos, selectedVars]
  );

  const [actions, setActions] = useState<Record<string, { action: CorrectionAction; applied: boolean }>>(() =>
    Object.fromEntries(typeReports.map((r) => [r.nombre, { action: r.suggestedAction, applied: false }]))
  );

  useMemo(() => {
    setActions((prev) => {
      const next = { ...prev };
      typeReports.forEach((r) => {
        if (!next[r.nombre]) next[r.nombre] = { action: r.suggestedAction, applied: false };
      });
      return next;
    });
  }, [typeReports]);

  const [activeTab, setActiveTab] = useState<"report" | "preview">("report");
  const [currentData, setCurrentData] = useState<any[]>(datos ?? []);

  const allApplied = typeReports.length > 0 && typeReports.every((r) => actions[r.nombre]?.applied);
  const totalErrors = typeReports.reduce((s, r) => s + r.errorCount, 0);
  const cleanColumns = selectedVars.filter((v) => !typeReports.find((r) => r.nombre === v.nombre));

  const handleActionChange = (col: string, action: CorrectionAction) =>
    setActions((prev) => ({ ...prev, [col]: { action, applied: false } }));

  const handleApplyOne = (report: ColumnTypeReport) => {
    const action = actions[report.nombre]?.action ?? "ignore";
    const result = applyCorrection(currentData, report, action);
    setCurrentData(result);
    setDatos(result);
    markDatasetCleaned();
    setActions((prev) => ({ ...prev, [report.nombre]: { ...prev[report.nombre], applied: true } }));
  };

  const handleApplyAll = () => {
    let result = [...currentData];
    typeReports.forEach((r) => {
      result = applyCorrection(result, r, actions[r.nombre]?.action ?? "ignore");
    });
    setCurrentData(result);
    setDatos(result);
    markDatasetCleaned();
    setActions((prev) => {
      const next = { ...prev };
      typeReports.forEach((r) => { next[r.nombre] = { ...next[r.nombre], applied: true }; });
      return next;
    });
  };

  const handleFinalizeAndGoGraphics = () => {
    let result = [...currentData];
    if (typeReports.length > 0) {
      typeReports.forEach((r) => {
        result = applyCorrection(result, r, actions[r.nombre]?.action ?? "ignore");
      });
    }
    setCurrentData(result);
    setDatos(result);
    markDatasetCleaned();
    navigate("/Calculos");
  };

  if (!datos || datos.length === 0) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        {/* <WarningAmberIcon sx={{ fontSize: 64, color: "#f59e0b", mb: 2 }} /> */}
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>No hay datos cargados</Typography>
        <Button variant="contained" onClick={() => navigate("/CargarDatos")}>Ir a Cargar Datos</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f9fb", p: { xs: 2, md: 4 } }}>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>   
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
            Validación de Tipos de Dato
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5}}>
            {currentData.length} registros · {selectedVariables.length} variables · Detección y corrección de inconsistencias
          </Typography>
        </Box>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        {[
          { label: "Columnas escaneadas", value: selectedVars.length, color: "#6366f1", bg: "#ede9fe", icon: <DataObjectIcon /> },
          { label: "Columnas con errores", value: typeReports.length, color: "#ef4444", bg: "#fee2e2", },
          { label: "Celdas erróneas totales", value: totalErrors, color: "#f59e0b", bg: "#fef3c7", },
          { label: "Columnas correctas", value: cleanColumns.length, color: "#22c55e", bg: "#dcfce7", },
        ].map((card) => (
          <Card key={card.label} sx={{ flex: "1 1 180px", borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: `1px solid ${card.bg}` }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{card.label}</Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Tabs */}
      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        {(["report", "preview"] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "contained" : "outlined"}
            onClick={() => setActiveTab(tab)}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
          >
            {tab === "report" ? "Informe de Tipos" : "Vista Previa del Dataset"}
          </Button>
        ))}
      </Box>

      {/* REPORT TAB */}
      {activeTab === "report" && (
        <>
          <Card sx={{ borderRadius: 3, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", mb: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 3, pb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Columnas con Errores de Tipo</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valores que no coinciden con el tipo declarado de la columna
                  </Typography>
                </Box>
                {typeReports.length > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<AutoFixHighIcon />}
                    onClick={handleApplyAll}
                    sx={{ borderRadius: 2, background: "linear-gradient(135deg, #f59e0b, #d97706)", fontWeight: 700, textTransform: "none" }}
                  >
                    Corregir Todo
                  </Button>
                )}
              </Box>
              <Divider />

              {typeReports.length === 0 ? (
                <Box sx={{ p: 5, textAlign: "center" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>¡Tipos consistentes!</Typography>
                  <Typography color="text.secondary">No se detectaron inconsistencias de tipo en ninguna columna seleccionada.</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        {["Columna", "Tipo declarado", "Celdas erróneas", "% Error", "Formato sugerido", "Ejemplo de corrección", "Acción", "Aplicar"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {typeReports.map((report) => {
                        const col = actions[report.nombre] ?? { action: report.suggestedAction, applied: false };
                        return (
                          <TableRow
                            key={report.nombre}
                            sx={{ bgcolor: col.applied ? "#f0fdf4" : "white", "&:hover": { bgcolor: col.applied ? "#dcfce7" : "#f8fafc" }, transition: "background 0.2s", verticalAlign: "top" }}
                          >
                            {/* Columna */}
                            <TableCell sx={{ pt: 2 }}>
                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                               <Box>
                                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{report.nombre}</Typography>
                                  <ErrorsExpandable errors={report.errorDetails} />
                                </Box>
                              </Box>
                            </TableCell>

                            {/* Tipo */}
                            <TableCell sx={{ pt: 2 }}><TypeBadge type={report.declaredType} /></TableCell>

                            {/* Erróneas */}
                            <TableCell sx={{ pt: 2 }}>
                              <Typography sx={{ fontWeight: 700, color: "#ef4444", fontSize: 14 }}>{report.errorCount}</Typography>
                              <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>de {report.total}</Typography>
                            </TableCell>

                            {/* % Error */}
                            <TableCell sx={{ pt: 2, minWidth: 90 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: report.errorPercent > 40 ? "#ef4444" : report.errorPercent > 15 ? "#f59e0b" : "#64748b" }}>
                                {report.errorPercent.toFixed(1)}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(report.errorPercent, 100)}
                                sx={{ height: 4, borderRadius: 2, bgcolor: "#f1f5f9", mt: 0.5, "& .MuiLinearProgress-bar": { bgcolor: report.errorPercent > 40 ? "#ef4444" : report.errorPercent > 15 ? "#f59e0b" : "#22c55e" } }}
                              />
                            </TableCell>

                            {/* Formato sugerido */}
                            <TableCell sx={{ pt: 2, maxWidth: 200 }}>
                              <Typography sx={{ fontSize: 12, color: "#0f172a", fontWeight: 500 }}>{report.suggestedFormat}</Typography>
                            </TableCell>

                            {/* Ejemplo */}
                            <TableCell sx={{ pt: 2 }}>
                              <Box sx={{ px: 1.5, py: 0.5, bgcolor: "#f0fdf4", borderRadius: 1.5, border: "1px solid #bbf7d0", fontFamily: "monospace", fontSize: 11, color: "#166534", display: "inline-block", whiteSpace: "nowrap" }}>
                                {report.castPreview}
                              </Box>
                            </TableCell>

                            {/* Acción selector */}
                            <TableCell sx={{ pt: 2 }}>
                              <FormControl size="small" sx={{ minWidth: 165 }}>
                                <Select
                                  value={col.action}
                                  onChange={(e) => handleActionChange(report.nombre, e.target.value as CorrectionAction)}
                                  disabled={col.applied}
                                  sx={{ fontSize: 12, borderRadius: 2 }}
                                >
                                  <MenuItem value="cast">
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <AutoFixHighIcon sx={{ fontSize: 14, color: "#6366f1" }} />
                                      Convertir al tipo
                                    </Box>
                                  </MenuItem>
                                  <MenuItem value="delete_row">
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#ef4444" }}>
                                      <DeleteSweepIcon sx={{ fontSize: 14 }} />
                                      Eliminar filas
                                    </Box>
                                  </MenuItem>
                                  <MenuItem value="ignore">
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#94a3b8" }}>
                                      <SkipNextIcon sx={{ fontSize: 14 }} />
                                      Ignorar
                                    </Box>
                                  </MenuItem>
                                </Select>
                              </FormControl>
                              {col.action === report.suggestedAction && !col.applied && (
                                <Typography sx={{ fontSize: 10, color: "#f59e0b", mt: 0.5 }}>✦ Acción sugerida</Typography>
                              )}
                            </TableCell>

                            {/* Aplicar */}
                            <TableCell sx={{ pt: 2 }}>
                              {col.applied ? (
                                <Chip  label="Corregido" color="success" size="small" sx={{ fontWeight: 700 }} />
                              ) : (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleApplyOne(report)}
                                  sx={{
                                    borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: 12,
                                    bgcolor: col.action === "delete_row" ? "#ef4444" : "#f59e0b",
                                    "&:hover": { bgcolor: col.action === "delete_row" ? "#dc2626" : "#d97706" },
                                  }}
                                >
                                  Aplicar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Clean columns */}
          {cleanColumns.length > 0 && (
            <Card sx={{ borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.04)", mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: "#22c55e" }}>
                  Columnas sin errores de tipo
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {cleanColumns.map((c) => (
                    <Chip key={c.nombre} label={c.nombre}  color="success" variant="outlined" size="small" />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* PREVIEW TAB */}
      {activeTab === "preview" && (
        <Card sx={{ borderRadius: 3, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Dataset {allApplied ? "Corregido" : "con Errores Resaltados"}
              </Typography>
              <Chip label={`${currentData.length} filas`} color={allApplied ? "success" : "warning"} size="small" />
            </Box>

            {datos.length !== currentData.length && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Se eliminaron {datos.length - currentData.length} filas con tipos incorrectos.
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {selectedVariables.map((col) => {
                      const hasErrors = !!typeReports.find((r) => r.nombre === col);
                      return (
                        <TableCell
                          key={col}
                          sx={{ fontWeight: 700, bgcolor: hasErrors ? "#f59e0b" : "#6366f1", color: "white", whiteSpace: "nowrap", fontSize: 12 }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        
                            {col}
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentData.slice(0, 100).map((row, i) => (
                    <TableRow key={i} hover>
                      {selectedVariables.map((col, j) => {
                        const raw = row[col];
                        const report = typeReports.find((r) => r.nombre === col);
                        let hasTypeError = false;
                        if (report && !actions[col]?.applied) {
                          const res = runValidation(raw, report.declaredType);
                          hasTypeError = !res.ok && raw !== null && raw !== undefined && String(raw).trim() !== "";
                        }
                        return (
                          <Tooltip key={j} title={hasTypeError ? `Tipo incorrecto: "${raw}" en columna ${report?.declaredType}` : ""} arrow>
                            <TableCell
                              sx={{
                                fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                bgcolor: hasTypeError ? "#fff7ed" : "transparent",
                                color: hasTypeError ? "#c2410c" : "inherit",
                                fontWeight: hasTypeError ? 700 : 400,
                                borderLeft: hasTypeError ? "2px solid #f59e0b" : "none",
                              }}
                            >
                              {hasTypeError ? `⚠ ${String(raw)}` : raw !== undefined && raw !== null ? String(raw) : "—"}
                            </TableCell>
                          </Tooltip>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "center" }}>
              Primeros 100 de {currentData.length} registros · Celdas naranjas = errores de tipo · Cabeceras amarillas = columnas con problemas
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
        <Button variant="outlined" onClick={() => navigate("/Limpieza")} sx={{ borderRadius: 2, textTransform: "none" }}>
          ← Volver a Limpieza de Nulos
        </Button>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {allApplied && typeReports.length > 0 && (
            <Alert severity="success" sx={{ py: 0.5, px: 2 }}>¡Todos los tipos corregidos!</Alert>
          )}
          <Button
            variant="contained"
            onClick={handleFinalizeAndGoGraphics}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, background: "linear-gradient(135deg, #22c55e, #16a34a)", px: 3 }}
          >
            Continuar a Cálculos →
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
