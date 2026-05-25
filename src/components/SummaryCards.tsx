import { Card, CardContent, Typography, Box } from "@mui/material";

const cards = [
  { label: "Columnas", color: "#4338ca" },
  { label: "Con nulos", color: "#d97706" },
  { label: "Total nulos", color: "#dc2626" },
  { label: "Limpias", color: "#16a34a" },
];

export default function SummaryCards({
  stats,
}: any) {
  const values = [
    stats.totalColumns,
    stats.columnsWithNulls,
    stats.totalNulls,
    stats.cleanColumns,
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit,minmax(220px,1fr))",
        gap: 2,
      }}
    >
      {cards.map((card, i) => (
        <Card
          key={card.label}
          sx={{
            borderLeft: `6px solid ${card.color}`,
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Typography>
              {card.label}
            </Typography>

            <Typography
              sx={{
                fontSize: 30,
                fontWeight: 800,
                color: card.color,
              }}
            >
              {values[i]}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}