import { useMemo } from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  Typography,
} from "@mui/material";

interface TablaDinamicaProps {
  datos: any[];
  columnas?: string[];
  maxRegistros?: number;
  titulo?: string;
}

export default function TablaDinamica({
  datos,
  columnas,
  maxRegistros = 50,
  titulo = "Vista de Datos",
}: TablaDinamicaProps) {
  const prettyHeader = (key: string) => {
    const map: Record<string, string> = {
      mediaAritmetica: "Media aritmetica",
      desviacionEstandar: "Desviacion estandar",
    };
    if (map[key]) return map[key];
    return key.replace(/([a-z])([A-Z])/g, "$1 $2");
  };

  // Mapear columnas automáticamente según el dataset
  const columns = useMemo(() => {
    if (columnas && columnas.length > 0) return columnas;
    if (datos.length === 0) return [];
    
    const allKeys = new Set<string>();
    datos.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });
    return Array.from(allKeys);
  }, [datos, columnas]);

  // Limitar cantidad de registros visibles
  const visibleData = useMemo(() => {
    return datos.slice(0, maxRegistros);
  }, [datos, maxRegistros]);

  const getCellValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <Typography variant="body2" color="text.secondary">-</Typography>;
    }
    if (typeof value === "boolean") {
      return (
        <Chip
          label={value ? "TRUE" : "FALSE"}
          color={value ? "success" : "error"}
          size="small"
        />
      );
    }
    if (typeof value === "number") {
      return <Typography variant="body2">{String(value)}</Typography>;
    }
    return <Typography variant="body2">{String(value)}</Typography>;
  };

  if (datos.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No hay datos para mostrar</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {titulo}
        </Typography>
        <Chip 
          label={`${visibleData.length} de ${datos.length} registros`} 
          color="primary" 
          variant="outlined" 
          size="small"
        />
      </Box>
      
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 500,
          overflow: "auto",
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "primary.main",
                    color: "white",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {prettyHeader(col)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {visibleData.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                sx={{
                  "&:nth-of-type(even)": {
                    bgcolor: "grey.50",
                  },
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                {columns.map((col, colIndex) => (
                  <TableCell
                    key={`${rowIndex}-${colIndex}`}
                    sx={{
                      maxWidth: 250,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getCellValue(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {datos.length > maxRegistros && (
        <Box sx={{ mt: 1, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Mostrando los primeros {maxRegistros} de {datos.length} registros
          </Typography>
        </Box>
      )}
    </Box>
  );
}
