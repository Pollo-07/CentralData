import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  InputAdornment,
  TableContainer,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SearchIcon from "@mui/icons-material/Search";
import * as XLSX from "xlsx";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const MIN_VARIABLES_REQUIRED = 8;

export default function CargarDatosExcel() {
  const navigate = useNavigate();
  const { 
    connection, 
    setConnection, 
    variables, 
    setVariables, 
    datos,
    updateDatosFromSource,
    selectedVariables,
    setSelectedVariables,
    addSelectedVariable,
    removeSelectedVariable,
  } = useApp();
  
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (connection.isConnected && Array.isArray(datos) && datos.length > 0) {
      setData(datos);
      const keys = Object.keys(datos[0] as any);
      setHeaders(keys);
    }
  }, [connection.isConnected, datos]);

  // Detectar tipo de variable
  const detectVariableType = (values: any[]): string => {
    const nonNull = values.filter(v => v != null);
    if (nonNull.length === 0) return "desconocido";
    
    const sample = nonNull[0];
    if (typeof sample === "number") return "number";
    if (typeof sample === "boolean") return "boolean";
    if (typeof sample === "string") {
      if (/^\d{4}-\d{2}-\d{2}/.test(sample)) return "date";
      return "string";
    }
    return "desconocido";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const binaryStr = evt.target?.result;
      const workbook = XLSX.read(binaryStr, { type: "binary" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(sheet);

      setData(jsonData);
      updateDatosFromSource(jsonData);
      
      if (jsonData.length > 0) {
        const keys = Object.keys(jsonData[0] as any);
        setHeaders(keys);

        // Detectar variables y tipos
        const detectedVariables = keys.map(key => {
          const values = jsonData.slice(0, 10).map((row: any) => row[key]);
          const hasNulls = values.some(v => v === null || v === undefined);
          return {
            nombre: key,
            tipo: detectVariableType(values),
            nullable: hasNulls,
          };
        });

        setVariables(detectedVariables);

        // Guardar estado de conexión
        setConnection({
          isConnected: true,
          url: file.name,
          nombre: file.name,
          lastUpdate: new Date(),
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleCancel = () => {
    setData([]);
    setHeaders([]);
    setSelectedVariables([]);
    setVariables([]);
    updateDatosFromSource([]);
    setConnection({
      isConnected: false,
      url: '',
      nombre: '',
      lastUpdate: null,
    });
    setShowPreview(false);
  };

  // Filtrar variables por búsqueda
  const filteredVariables = useMemo(() => {
    if (!searchTerm) return variables;
    return variables.filter(v => 
      v.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [variables, searchTerm]);

  const handleToggleVariable = (varName: string) => {
    if (selectedVariables.includes(varName)) {
      removeSelectedVariable(varName);
    } else {
      addSelectedVariable(varName);
    }
  };

  const handleContinuar = () => {
    setShowPreview(true);
  };

  const handleGoToLimpieza = () => {
    navigate('/Limpieza');
  };

  const validationError = selectedVariables.length < MIN_VARIABLES_REQUIRED 
    ? `Debe seleccionar al menos ${MIN_VARIABLES_REQUIRED} variables`
    : null;

  const canProceed = connection.isConnected && selectedVariables.length >= MIN_VARIABLES_REQUIRED;

  const getTypeColor = (tipo: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (tipo) {
      case "number": return "primary";
      case "string": return "secondary";
      case "boolean": return "success";
      case "date": return "info";
      default: return "default";
    }
  };

  // Vista previa de datos seleccionados
  if (showPreview && selectedVariables.length > 0) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f7f9fb" }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
          Vista Previa de Datos
        </Typography>

        {/* Estado */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#e8f5e9', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label="CONECTADO" 
              color="success"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2">
              {data.length} registros | {selectedVariables.length} variables seleccionadas
            </Typography>
          </Box>
        </Box>

        {/* Tabla de datos seleccionados */}
        <Card sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Datos de Variables Seleccionadas
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: "auto" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {selectedVariables.map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 700, bgcolor: "primary.main", color: "white" }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.slice(0, 50).map((row, i) => (
                    <TableRow key={i} hover>
                      {selectedVariables.map((col, j) => (
                        <TableCell key={j} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row[col] !== undefined ? String(row[col]) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 1, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Mostrando los primeros 50 de {data.length} registros
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            color="error"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setShowPreview(false)}
          >
            Cambiar Selección
          </Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={handleGoToLimpieza}
          >
            Continuar a Limpieza
          </Button>
        </Box>
      </Box>
    );
  }

  // Vista principal de carga
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f9fb" }}>
      <Box sx={{ width: "100%", maxWidth: 1100 }}>
        
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
          Cargar archivo Excel
        </Typography>

        {/* Estado de conexión */}
        <Box sx={{ mb: 3, p: 2, bgcolor: connection.isConnected ? '#e8f5e9' : '#fff3e0', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={connection.isConnected ? "CONECTADO" : "SIN CONEXIÓN"} 
              color={connection.isConnected ? "success" : "warning"}
              sx={{ fontWeight: 700 }}
            />
            {connection.isConnected && connection.nombre && (
              <Typography variant="body2">
                Archivo: {connection.nombre}
              </Typography>
            )}
          </Box>
        </Box>

        <Card sx={{ borderRadius: 4, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <CardContent sx={{ p: 4 }}>

            {!connection.isConnected ? (
              <Box
                sx={{
                  border: "2px dashed #d0d5dd",
                  borderRadius: 3,
                  p: 5,
                  textAlign: "center",
                  mb: 4,
                  transition: "0.3s",
                  "&:hover": {
                    borderColor: "#1976d2",
                    bgcolor: "#f0f7ff",
                  },
                }}
              >
                <UploadFileIcon sx={{ fontSize: 50, mb: 2, color: "#1976d2" }} />

                <Typography sx={{ fontWeight: 600, mb: 1 }}>
                  Arrastra tu archivo o súbelo
                </Typography>

                <Typography sx={{ fontSize: 13, color: "gray", mb: 2 }}>
                  Formatos soportados: .xlsx, .xls
                </Typography>

                <Button
                  variant="contained"
                  component="label"
                  sx={{ borderRadius: 2 }}
                >
                  Seleccionar archivo
                  <input type="file" hidden onChange={handleFile} accept=".xlsx,.xls" />
                </Button>
              </Box>
            ) : (
              <>
                {/* Vista previa del archivo */}
                <Typography sx={{ fontWeight: 700, mb: 2 }}>
                  Vista previa del archivo ({data.length} registros, {headers.length} columnas)
                </Typography>

                <Paper sx={{ borderRadius: 3, overflow: "auto", maxHeight: 300, mb: 4 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {headers.map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, bgcolor: "#f1f5f9" }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {data.slice(0, 5).map((row, i) => (
                        <TableRow key={i} hover>
                          {headers.map((h) => (
                            <TableCell key={h}>
                              {row[h]?.toString()}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>

                <Divider sx={{ my: 3 }} />

                {/* Selección de variables */}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Seleccionar Variables de Estudio
                </Typography>

                {/* Buscador */}
                <TextField
                  fullWidth
                  placeholder="Buscar variables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{ mb: 2 }}
                />

                {/* Validación */}
                {validationError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {validationError}
                  </Alert>
                )}
                {selectedVariables.length >= MIN_VARIABLES_REQUIRED && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    ✓ Selección válida: {selectedVariables.length} variables seleccionadas
                  </Alert>
                )}

                {/* Contador */}
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`${selectedVariables.length} / ${MIN_VARIABLES_REQUIRED} mínimo`}
                    color={selectedVariables.length >= MIN_VARIABLES_REQUIRED ? "success" : "warning"}
                    variant={selectedVariables.length >= MIN_VARIABLES_REQUIRED ? "filled" : "outlined"}
                  />
                </Box>

                {/* Lista de variables */}
                <Paper sx={{ maxHeight: 250, overflow: 'auto', mb: 3 }}>
                  <List dense>
                    {filteredVariables.map((variable) => {
                      const isSelected = selectedVariables.includes(variable.nombre);
                      return (
                        <ListItem
                          key={variable.nombre}
                          onClick={() => handleToggleVariable(variable.nombre)}
                          sx={{ 
                            cursor: 'pointer',
                            bgcolor: isSelected ? 'action.selected' : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <ListItemIcon>
                            {isSelected ? (
                              <CheckCircleIcon color="primary" />
                            ) : (
                              <RadioButtonUncheckedIcon />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={variable.nombre}
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                <Chip
                                  label={variable.tipo}
                                  size="small"
                                  color={getTypeColor(variable.tipo)}
                                  variant="outlined"
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>

                {/* Botones de acción */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="contained" 
                    color="success"
                    disabled={!canProceed}
                    onClick={handleContinuar}
                  >
                    Ver Vista Previa
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
