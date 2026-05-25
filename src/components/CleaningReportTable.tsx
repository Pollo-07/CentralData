import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
} from "@mui/material";

export default function CleaningReportTable({
  columns,
  actions,
  onApply,
}: any) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Columna</TableCell>
          <TableCell>Nulos</TableCell>
          <TableCell>Media</TableCell>
          <TableCell>Mediana</TableCell>
          <TableCell>Moda</TableCell>
          <TableCell>Acción</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {columns.map((col: any) => (
          <TableRow key={col.nombre}>
            <TableCell>
              {col.nombre}
            </TableCell>

            <TableCell>
              {col.nullCount}
            </TableCell>

            <TableCell>
              {col.mean ?? "-"}
            </TableCell>

            <TableCell>
              {col.median ?? "-"}
            </TableCell>

            <TableCell>
              {col.mode ?? "-"}
            </TableCell>

            <TableCell>
              {actions[col.nombre]?.applied ? (
                <Chip
                  label="Aplicado"
                  sx={{
                    bgcolor: "#16a34a",
                    color: "white",
                  }}
                />
              ) : (
                <Button
                  onClick={() =>
                    onApply(col.nombre)
                  }
                >
                  Aplicar
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}