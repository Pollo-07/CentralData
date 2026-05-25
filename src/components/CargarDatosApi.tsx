import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { useApp } from "../context/AppContext";

const MIN_VARIABLES_REQUIRED = 8;

export default function CargarDatosApi() {
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
  
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Sincronizar URL local con estado global
  useEffect(() => {
    if (connection.url) {
      setUrl(connection.url);
    }
  }, [connection.url]);

  useEffect(() => {
    if (connection.isConnected && Array.isArray(datos) && datos.length > 0) {
      setData(datos);
    }
  }, [connection.isConnected, datos]);

  const isValidURL = (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const isFormValid = url.trim() !== "" && isValidURL(url);

  // Validación de mínimo de variables
  const validationError = selectedVariables.length < MIN_VARIABLES_REQUIRED 
    ? `Debe seleccionar al menos ${MIN_VARIABLES_REQUIRED} variables (seleccionadas: ${selectedVariables.length})`
    : null;

  const canProceed = connection.isConnected && selectedVariables.length >= MIN_VARIABLES_REQUIRED;

  const handleCancel = () => {
    setUrl("");
    setToken("");
    setNombre("");
    setError("");
    setData([]);
    setSelectedVariables([]);
    setShowPreview(false);
    // Resetear conexión
    setConnection({
      isConnected: false,
      url: '',
      nombre: '',
      lastUpdate: null,
    });
    setVariables([]);
    updateDatosFromSource([]);
  };

  const extractArray = (obj: any): any[] => {
    if (Array.isArray(obj)) return obj;
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        return obj[key];
      }
    }
    return [obj];
  };

  const flattenObject = (obj: any, parent = "", res: any = {}) => {
    for (let key in obj) {
      const propName = parent ? `${parent}.${key}` : key;
      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        flattenObject(obj[key], propName, res);
      } else {
        res[propName] = obj[key];
      }
    }
    return res;
  };

  const detectVariableType = (value: any): string => {
    if (value === null || value === undefined) return "desconocido";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "string") {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
      return "string";
    }
    return "desconocido";
  };

  const handleFetch = async () => {
    setError("");
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 401) throw new Error("401: Credenciales inválidas");
      if (res.status === 404) throw new Error("404: Recurso no encontrado");
      if (res.status >= 500) throw new Error("500: Error en servidor externo");

      const json = await res.json();
      const extracted = extractArray(json);
      const flatData = extracted.map((item) => flattenObject(item));

      setData(flatData);
      updateDatosFromSource(flatData);

      // Extraer variables únicas
      if (flatData.length > 0) {
        const allKeys = new Set<string>();
        flatData.forEach(row => {
          Object.keys(row).forEach(key => allKeys.add(key));
        });

        const detectedVariables = Array.from(allKeys).map(key => {
          const sampleValues = flatData.slice(0, 10).map(row => row[key]);
          const nonNullValues = sampleValues.filter(v => v != null);
          const primaryType = nonNullValues.length > 0 
            ? detectVariableType(nonNullValues[0]) 
            : "desconocido";
          const hasNulls = sampleValues.some(v => v === null || v === undefined);

          return {
            nombre: key,
            tipo: primaryType,
            nullable: hasNulls,
          };
        });

        setVariables(detectedVariables);
      }

      // Guardar estado de conexión
      setConnection({
        isConnected: true,
        url: url,
        nombre: nombre || url,
        lastUpdate: new Date(),
      });

    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Timeout: el servidor tardó demasiado");
      } else {
        setError(err.message || "Error desconocido");
      }
      setConnection({
        isConnected: false,
        url: '',
        nombre: '',
        lastUpdate: null,
      });
    } finally {
      setLoading(false);
    }
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

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f9fb" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        Obtener datos desde Api
      </Typography>

      {/* Estado de conexión */}
      <Box sx={{ mb: 3, p: 2, bgcolor: connection.isConnected ? '#e8f5e9' : '#ffebee', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={connection.isConnected ? "CONECTADO" : "DESCONECTADO"} 
            color={connection.isConnected ? "success" : "error"}
            sx={{ fontWeight: 700 }}
          />
          {connection.isConnected && connection.nombre && (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {connection.nombre}
            </Typography>
          )}
          {connection.isConnected && connection.lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              Última actualización: {connection.lastUpdate.toLocaleString()}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ width: "100%", maxWidth: 1100 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* URL */}
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>
              Endpoint de API *
            </Typography>

            <TextField
              fullWidth
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.com/data"
              error={url !== "" && !isValidURL(url)}
              disabled={connection.isConnected}
              helperText={
                url !== "" && !isValidURL(url)
                  ? "URL inválida"
                  : connection.isConnected
                  ? "Conectado - URL no editable"
                  : "Campo obligatorio"
              }
              sx={{ mb: 4 }}
            />

            {/* Token y nombre */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Token o API Key (Opcional)"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={connection.isConnected}
                  helperText="Solo necesario si la API requiere autenticación"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Nombre de la conexión (Opcional)"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={connection.isConnected}
                  helperText="Solo para identificar esta API"
                />
              </Grid>
            </Grid>

            {/* Método */}
            <TextField
              fullWidth
              label="Método"
              value="GET"
              disabled
              sx={{ mb: 4 }}
            />

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Tabla dinámica - solo mostrar si hay datos */}
            {Array.isArray(data) && data.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>
                  Estructura de Datos Detectada ({data.length} registros, {variables.length} columnas)
                </Typography>
                
                {/* Mini tabla - primeros 5 registros */}
                <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: "auto", mb: 2 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {variables.slice(0, 6).map((col) => (
                          <TableCell key={col.nombre} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                            {col.nombre}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {variables.slice(0, 6).map((col, j) => (
                            <TableCell key={j} sx={{ fontSize: '0.75rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row[col.nombre] !== undefined ? String(row[col.nombre]) : '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Lista de variables disponibles y filtro */}
            {connection.isConnected && variables.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ mb: 3 }} />
                
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Variables Disponibles ({variables.length})
                </Typography>

                {/* Buscador */}
                <TextField
                  fullWidth
                  placeholder="Buscar variables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
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

                {/* Lista de variables con checkboxes */}
                <Paper sx={{ maxHeight: 300, overflow: 'auto', mb: 3 }}>
                  <List dense>
                    {filteredVariables.map((variable) => {
                      const isSelected = selectedVariables.includes(variable.nombre);
                      return (
                        <ListItem
                          key={variable.nombre}
                          onClick={() => handleToggleVariable(variable.nombre)}
                          sx={{ cursor: 'pointer', bgcolor: isSelected ? 'action.selected' : 'transparent' }}
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
                                {variable.nullable && (
                                  <Chip
                                    label="Permite nulos"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip 
                    label={`${selectedVariables.length} / ${MIN_VARIABLES_REQUIRED} mínimo`}
                    color={selectedVariables.length >= MIN_VARIABLES_REQUIRED ? "success" : "warning"}
                    variant={selectedVariables.length >= MIN_VARIABLES_REQUIRED ? "filled" : "outlined"}
                  />
                </Box>
              </Box>
            )}
          </CardContent>

          {/* Footer con botones Continuar y Cancelar */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              p: 3,
              bgcolor: "#f2f4f6",
            }}
          >
            <Button 
              onClick={handleCancel} 
              disabled={loading}
              color="error"
            >
              Cancelar
            </Button>

            <Button
              variant="contained"
              disabled={!isFormValid || loading || connection.isConnected}
              onClick={handleFetch}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? "Conectando..." : "Conectar"}
            </Button>

            {connection.isConnected && (
              <Button
                variant="contained"
                color="success"
                disabled={!canProceed}
                onClick={handleContinuar}
              >
                Continuar
              </Button>
            )}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
