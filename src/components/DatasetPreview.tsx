import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
} from "@mui/material";

export default function DatasetPreview({
  data,
  columns,
}: any) {
  return (
    <TableContainer
      component={Paper}
      elevation={2}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        maxHeight: 350,
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {columns.map((col: string) => (
              <TableCell
                key={col}
                sx={{
                  backgroundColor: "#1976d2",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  padding: "8px",
                  
                }}
              >
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {data.slice(0, 10).map((row: any, i: number) => (
            <TableRow
              key={i}
              hover
              sx={{
                "&:nth-of-type(even)": {
                  backgroundColor: "#f8f9fa",
                },
              }}
            >
              {columns.map((col: string) => (
                <TableCell
                  key={col}
                  sx={{
                    fontSize: "0.8rem",
                    padding: "6px 8px",
                  }}
                >
                  {String(row[col])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}