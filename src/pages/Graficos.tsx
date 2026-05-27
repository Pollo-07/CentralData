import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Checkbox, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import { useApp, type SerializedChart } from "../context/AppContext";
import { isYearColumn } from "../utils/cleaningUtils";

const toNumber = (v: any) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const normalizeFilterValue = (value: any) => String(value ?? "").trim().toLowerCase();

const displayFilterValue = (value: any) => String(value ?? "").trim();

const pearson = (a: number[], b: number[]) => {
  if (a.length !== b.length || a.length < 3) return 0;
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
};

const quantile = (arr: number[], q: number) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
};

const boxStats = (arr: number[]) => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
};

const PALETTE = [
  "#1E88E5",
  "#E53935",
  "#43A047",
  "#FB8C00",
  "#8E24AA",
  "#00897B",
  "#6D4C41",
  "#3949AB",
  "#D81B60",
  "#546E7A",
];

const colorForVariable = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export default function Graficos() {
  const { datos, selectedVariables, isDatasetCleaned, setSerializedCharts } = useApp();
  const navigate = useNavigate();
  const [includeMap, setIncludeMap] = useState<Record<string, boolean>>({});
  const [filterCol, setFilterCol] = useState("");
  const [filterVal, setFilterVal] = useState("");

  const meta = useMemo(() => {
    return selectedVariables.map((col) => {
      const sample = (datos ?? []).slice(0, 200).map((r) => r[col]);
      const nums = sample.map(toNumber).filter((n): n is number => n !== null);
      const numeric = nums.length > 0 && nums.length / Math.max(sample.length, 1) > 0.7 && !isYearColumn(col);
      return { col, numeric };
    });
  }, [datos, selectedVariables]);

  const filterCols = useMemo(() => selectedVariables.filter((c) => datos?.some((r) => r[c] !== undefined)), [datos, selectedVariables]);

  const filterOptions = useMemo(() => {
    if (!filterCol) return [];
    const counts = new Map<string, { label: string; count: number }>();
    (datos ?? []).forEach((row) => {
      const value = normalizeFilterValue(row[filterCol]);
      if (!value) return;
      const label = displayFilterValue(row[filterCol]);
      const current = counts.get(value);
      counts.set(value, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 });
    });
    return [...counts.entries()]
      .map(([value, option]) => ({ value, label: option.label, count: option.count }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
  }, [datos, filterCol]);

  const filteredData = useMemo(() => {
    if (!filterCol || !filterVal) return datos ?? [];
    return (datos ?? []).filter((row) => normalizeFilterValue(row[filterCol]) === filterVal);
  }, [datos, filterCol, filterVal]);

  const hasEnoughRowsForCorrelation = filteredData.length >= 3;
  const hasActiveFilter = Boolean(filterCol && filterVal);

  useEffect(() => {
    if (filterCol && !filterCols.includes(filterCol)) {
      setFilterCol("");
      setFilterVal("");
      return;
    }

    if (filterVal && !filterOptions.some((option) => option.value === filterVal)) {
      setFilterVal("");
    }
  }, [filterCol, filterCols, filterOptions, filterVal]);

  const numericCols = useMemo(() => meta.filter((m) => m.numeric).map((m) => m.col), [meta]);

  const corrMatrix = useMemo(() => {
    const matrix: number[][] = [];
    for (let i = 0; i < numericCols.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < numericCols.length; j++) {
        const a = numericCols[i];
        const b = numericCols[j];
        const vals = filteredData
          .map((r) => ({ x: toNumber(r[a]), y: toNumber(r[b]) }))
          .filter((v): v is { x: number; y: number } => v.x !== null && v.y !== null);
        matrix[i][j] = vals.length >= 3 ? pearson(vals.map((v) => v.x), vals.map((v) => v.y)) : 0;
      }
    }
    return matrix;
  }, [filteredData, numericCols]);

  const topPairs = useMemo(() => {
    const pairs: { a: string; b: string; corr: number }[] = [];
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        pairs.push({ a: numericCols[i], b: numericCols[j], corr: corrMatrix[i]?.[j] ?? 0 });
      }
    }
    return pairs.sort((x, y) => Math.abs(y.corr) - Math.abs(x.corr)).slice(0, 4);
  }, [numericCols, corrMatrix]);

  const strongPairs = useMemo(() => topPairs.filter((p) => Math.abs(p.corr) >= 0.7), [topPairs]);
  const moderatePairs = useMemo(() => topPairs.filter((p) => Math.abs(p.corr) >= 0.4 && Math.abs(p.corr) < 0.7), [topPairs]);

  const variableImportance = useMemo(() => {
    const values = numericCols.map((c, i) => {
      let score = 0;
      for (let j = 0; j < numericCols.length; j++) if (i !== j) score += Math.abs(corrMatrix[i]?.[j] ?? 0);
      return { name: c, value: Number(score.toFixed(4)) };
    });
    return values.sort((a, b) => b.value - a.value);
  }, [numericCols, corrMatrix]);

  const topVariables = useMemo(() => variableImportance.slice(0, 5).map((x) => x.name), [variableImportance]);

  const corrHeatOption = useMemo(() => {
    const data: [number, number, number][] = [];
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = 0; j < numericCols.length; j++) data.push([i, j, Number((corrMatrix[i]?.[j] ?? 0).toFixed(3))]);
    }
    return {
      tooltip: { position: "top", formatter: (params: any) => `${numericCols[params.value[0]]} vs ${numericCols[params.value[1]]}: ${params.value[2]}` },
      xAxis: { type: "category", data: numericCols, axisLabel: { rotate: 35 } },
      yAxis: { type: "category", data: numericCols },
      visualMap: { min: -1, max: 1, calculable: true, orient: "horizontal", left: "center", bottom: 0 },
      series: [{ type: "heatmap", data, label: { show: true, formatter: (params: any) => params.value[2] }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.4)" } } }],
    };
  }, [numericCols, corrMatrix]);

  const importanceBarOption = useMemo(() => ({
    tooltip: {},
    xAxis: { type: "category", data: variableImportance.map((x) => x.name), axisLabel: { rotate: 25 } },
    yAxis: { type: "value" },
    series: [{
      type: "bar",
      data: variableImportance.map((x) => ({
        value: x.value,
        itemStyle: { color: colorForVariable(x.name) },
      })),
    }],
  }), [variableImportance]);

  const importancePieOption = useMemo(() => ({
    tooltip: { trigger: "item" },
    legend: { orient: "vertical", left: "left" },
    series: [
      {
        type: "pie",
        radius: "65%",
        data: variableImportance.map((x) => ({
          value: x.value,
          name: x.name,
          itemStyle: { color: colorForVariable(x.name) },
        })),
        label: { formatter: "{b}: {d}%" },
      },
    ],
  }), [variableImportance]);

  const scatterOptions = useMemo(() => {
    return topPairs.map((p) => {
      const pts = filteredData
        .map((r) => [toNumber(r[p.a]), toNumber(r[p.b])])
        .filter((v): v is [number, number] => v[0] !== null && v[1] !== null);
      return {
        id: `scatter:${p.a}:${p.b}`,
        title: `${p.a} vs ${p.b} (corr ${p.corr.toFixed(2)})`,
        option: {
          tooltip: {},
          xAxis: { type: "value", name: p.a },
          yAxis: { type: "value", name: p.b },
          series: [{ type: "scatter", symbolSize: 8, data: pts.slice(0, 300), itemStyle: { color: colorForVariable(`${p.a}:${p.b}`) } }],
        },
        payload: pts.slice(0, 300),
      };
    });
  }, [filteredData, topPairs]);

  const lineTrendOptions = useMemo(() => {
    return strongPairs.map((p) => {
      const rows = filteredData
        .map((r) => ({ x: toNumber(r[p.a]), y: toNumber(r[p.b]) }))
        .filter((v): v is { x: number; y: number } => v.x !== null && v.y !== null)
        .sort((u, v) => u.x - v.x);

      if (rows.length < 10) return null;

      const buckets = 12;
      const min = rows[0].x;
      const max = rows[rows.length - 1].x;
      const step = (max - min) / buckets || 1;
      const series = Array.from({ length: buckets }).map((_, i) => {
        const from = min + i * step;
        const to = i === buckets - 1 ? max : from + step;
        const slice = rows.filter((r) => (i === buckets - 1 ? r.x >= from && r.x <= to : r.x >= from && r.x < to));
        const yAvg = slice.length ? slice.reduce((s, r) => s + r.y, 0) / slice.length : null;
        return { x: Number(((from + to) / 2).toFixed(3)), y: yAvg };
      }).filter((d) => d.y !== null) as { x: number; y: number }[];

      if (series.length < 3) return null;

      return {
        id: `line:${p.a}:${p.b}`,
        title: `Tendencia ${p.b} segun ${p.a} (corr ${p.corr.toFixed(2)})`,
        option: {
          tooltip: {},
          xAxis: { type: "value", name: p.a },
          yAxis: { type: "value", name: p.b },
          series: [
            {
              type: "line",
              smooth: true,
              data: series.map((d) => [d.x, d.y]),
              lineStyle: { width: 3, color: colorForVariable(`${p.a}:${p.b}:line`) },
              itemStyle: { color: colorForVariable(`${p.a}:${p.b}:line`) },
            },
          ],
        },
        payload: series,
      };
    }).filter(Boolean) as { id: string; title: string; option: any; payload: { x: number; y: number }[] }[];
  }, [filteredData, strongPairs]);

  const boxPlotOption = useMemo(() => {
    const stats = topVariables
      .map((v) => {
        const vals = filteredData.map((r) => toNumber(r[v])).filter((n): n is number => n !== null);
        const b = boxStats(vals);
        if (!b) return null;
        return { variable: v, vals: [b.min, b.q1, b.median, b.q3, b.max], iqr: b.q3 - b.q1 };
      })
      .filter(Boolean) as { variable: string; vals: number[]; iqr: number }[];

    if (!stats.length) return null;

    return {
      stats,
      option: {
        tooltip: {},
        xAxis: { type: "category", data: stats.map((s) => s.variable) },
        yAxis: { type: "value" },
        series: [
          {
            type: "boxplot",
            data: stats.map((s) => s.vals),
            itemStyle: { color: "#90caf9", borderColor: "#1976d2" },
          },
        ],
      },
    };
  }, [filteredData, topVariables]);

  const analyticalInsights = useMemo(() => {
    const insights: string[] = [];
    if (strongPairs.length > 0) {
      insights.push(
        `Relacion fuerte detectada: ${strongPairs
          .slice(0, 2)
          .map((p) => `${p.a} vs ${p.b} (${p.corr.toFixed(2)})`)
          .join(", ")}.`
      );
    } else if (moderatePairs.length > 0) {
      insights.push(
        `No hay correlaciones fuertes; se observan relaciones moderadas en ${moderatePairs
          .slice(0, 2)
          .map((p) => `${p.a} vs ${p.b} (${p.corr.toFixed(2)})`)
          .join(", ")}.`
      );
    } else {
      insights.push("No hay relaciones lineales significativas; revisar variables categóricas o transformación de variables.");
    }

    if (boxPlotOption?.stats?.length) {
      const topSpread = [...boxPlotOption.stats].sort((a, b) => b.iqr - a.iqr)[0];
      insights.push(`Mayor variabilidad en ${topSpread.variable} (IQR ${topSpread.iqr.toFixed(2)}), priorizar análisis de dispersión y atípicos.`);
    }

    return insights;
  }, [strongPairs, moderatePairs, boxPlotOption]);

  const categoricalBusinessChart = useMemo(() => {
    const nameCol = selectedVariables.find((v) => /nombre|name/i.test(v));
    const winnerCol = selectedVariables.find((v) => /ganador|winner|wins/i.test(v));
    if (!nameCol || !winnerCol) return null;
    const counts = new Map<string, number>();
    filteredData.forEach((r) => {
      const key = String(r[nameCol] ?? "sin_nombre");
      const n = toNumber(r[winnerCol]) ?? 0;
      counts.set(key, (counts.get(key) ?? 0) + n);
    });
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    return {
      id: "business:nombre-ganador",
      title: `${nameCol} vs ${winnerCol}`,
      option: {
        tooltip: {},
        xAxis: { type: "category", data: rows.map((r) => r[0]), axisLabel: { rotate: 25 } },
        yAxis: { type: "value" },
        series: [{ type: "bar", data: rows.map((r) => r[1]), itemStyle: { color: colorForVariable(nameCol) } }],
      },
      payload: rows.map(([name, value]) => ({ name, value })),
    };
  }, [filteredData, selectedVariables]);

  const goReport = () => {
    const out: SerializedChart[] = [];
    if (includeMap["corr:heat"]) out.push({ id: "corr:heat", title: "Mapa de correlacion", type: "heatmap", payload: { cols: numericCols, matrix: corrMatrix } });
    if (includeMap["corr:importance"]) out.push({ id: "corr:importance", title: "Importancia por correlacion", type: "bar", payload: variableImportance });
    scatterOptions.forEach((s) => { if (includeMap[s.id]) out.push({ id: s.id, title: s.title, type: "scatter", payload: s.payload }); });
    lineTrendOptions.forEach((l) => { if (includeMap[l.id]) out.push({ id: l.id, title: l.title, type: "line", payload: l.payload }); });
    if (boxPlotOption && includeMap["dist:boxplot"]) {
      out.push({ id: "dist:boxplot", title: "Distribucion por boxplot", type: "boxplot", payload: boxPlotOption.stats });
    }
    if (categoricalBusinessChart && includeMap[categoricalBusinessChart.id]) out.push({ id: categoricalBusinessChart.id, title: categoricalBusinessChart.title, type: "bar", payload: categoricalBusinessChart.payload });
    setSerializedCharts(out);
    navigate("/Reportes");
  };

  if (!isDatasetCleaned) {
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
              Debes ejecutar el proceso de limpieza antes de analizar gráficos.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/Limpieza")}
              sx={{ bgcolor: "#4338ca", fontWeight: 700, borderRadius: 2, px: 3, "&:hover": { bgcolor: "#312e81" } }}
            >
              Ir a Limpieza
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (numericCols.length < 2) {
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
            maxWidth: 560,
            width: "100%",
            borderRadius: 4,
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            textAlign: "center",
            p: 3,
          }}
        >
          <CardContent>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#0f172a" }}>
              No aplica análisis de correlación
            </Typography>
            <Typography sx={{ color: "#64748b", mb: 3 }}>
              Se requieren al menos 2 variables numéricas válidas para generar gráficos de correlación.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/CargarDatos")}
              sx={{ bgcolor: "#4338ca", fontWeight: 700, borderRadius: 2, px: 3, "&:hover": { bgcolor: "#312e81" } }}
            >
              Ir a Cargar Datos
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: "#f7f9fb", minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Graficos profesionales guiados por correlacion</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Insights automáticos del dataset</Typography>
          {analyticalInsights.map((ins, idx) => (
            <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
              {idx + 1}. {ins}
            </Typography>
          ))}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Filtro por variable</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <FormControl size="small">
              <InputLabel>Variable</InputLabel>
              <Select value={filterCol} label="Variable" onChange={(e) => { setFilterCol(e.target.value); setFilterVal(""); }}>
                <MenuItem value="">Sin filtro</MenuItem>
                {filterCols.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" disabled={!filterCol}>
              <InputLabel>Valor</InputLabel>
              <Select value={filterVal} label="Valor" onChange={(e) => setFilterVal(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {filterOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.value} ({option.count} registros)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Typography variant="caption">Registros usados: {filteredData.length} de {(datos ?? []).length}</Typography>
          {hasActiveFilter && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Filtro activo: {filterCol} = {filterOptions.find((option) => option.value === filterVal)?.label ?? filterVal}. Los graficos se recalculan solo con esos registros.
            </Alert>
          )}
          {filteredData.length === 0 && (
            <Alert severity="error" sx={{ mt: 1 }}>
              Este filtro no encontro registros. Cambia el valor o limpia el filtro para volver al dataset completo.
            </Alert>
          )}
          {filteredData.length > 0 && !hasEnoughRowsForCorrelation && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Este filtro deja menos de 3 registros. La correlacion necesita al menos 3 datos comparables, por eso el mapa puede verse en 0 y los demas graficos pierden significado.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700 }}>Mapa de calor de correlacion</Typography>
          <ReactECharts option={corrHeatOption} style={{ height: 420 }} />
          <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {numericCols.map((v) => (
              <Box key={v} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colorForVariable(v) }} />
                <Typography variant="caption">{v}</Typography>
              </Box>
            ))}
          </Box>
          <Box><Checkbox checked={!!includeMap["corr:heat"]} onChange={(e) => setIncludeMap((p) => ({ ...p, "corr:heat": e.target.checked }))} />Incluir en reporte</Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700 }}>Variables mas relevantes por correlacion</Typography>
          <ReactECharts option={importanceBarOption} style={{ height: 320 }} />
          <Typography sx={{ fontWeight: 700, mt: 2 }}>Distribucion (torta) de importancia</Typography>
          <ReactECharts option={importancePieOption} style={{ height: 320 }} />
          <Box><Checkbox checked={!!includeMap["corr:importance"]} onChange={(e) => setIncludeMap((p) => ({ ...p, "corr:importance": e.target.checked }))} />Incluir en reporte</Box>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>Dispersion de pares con mayor correlacion</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 2, mb: 2 }}>
        {scatterOptions.map((s) => (
          <Card key={s.id}>
            <CardContent>
              <Typography sx={{ fontWeight: 700 }}>{s.title}</Typography>
              <ReactECharts option={s.option} style={{ height: 300 }} />
              <Box><Checkbox checked={!!includeMap[s.id]} onChange={(e) => setIncludeMap((p) => ({ ...p, [s.id]: e.target.checked }))} />Incluir en reporte</Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {lineTrendOptions.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>Line plot de tendencia para relaciones fuertes</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 2, mb: 2 }}>
            {lineTrendOptions.map((l) => (
              <Card key={l.id}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700 }}>{l.title}</Typography>
                  <ReactECharts option={l.option} style={{ height: 300 }} />
                  <Box><Checkbox checked={!!includeMap[l.id]} onChange={(e) => setIncludeMap((p) => ({ ...p, [l.id]: e.target.checked }))} />Incluir en reporte</Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {boxPlotOption && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700 }}>Box plot de distribucion (variables mas relevantes)</Typography>
            <ReactECharts option={boxPlotOption.option} style={{ height: 340 }} />
            <Box><Checkbox checked={!!includeMap["dist:boxplot"]} onChange={(e) => setIncludeMap((p) => ({ ...p, "dist:boxplot": e.target.checked }))} />Incluir en reporte</Box>
          </CardContent>
        </Card>
      )}

      {categoricalBusinessChart && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700 }}>Grafico de negocio (cuando aplica)</Typography>
            <ReactECharts option={categoricalBusinessChart.option} style={{ height: 320 }} />
            <Box><Checkbox checked={!!includeMap[categoricalBusinessChart.id]} onChange={(e) => setIncludeMap((p) => ({ ...p, [categoricalBusinessChart.id]: e.target.checked }))} />Incluir en reporte</Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={goReport}>Continuar a Reportes</Button>
      </Box>
    </Box>
  );
}
