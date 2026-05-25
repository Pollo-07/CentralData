import { Box, Alert, Button, Typography } from "@mui/material";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import * as echarts from "echarts";
import logoCentralData from "../assets/logo-centralData.png";

const Reportes = () => {
  const { datos, isDatasetCleaned, connection, serializedCharts } = useApp();
  const navigate = useNavigate();
  const [isDownloadingDataset, setIsDownloadingDataset] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const downloadCleanedDataset = () => {
    try {
      setIsDownloadingDataset(true);
      const ws = XLSX.utils.json_to_sheet(datos ?? []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "dataset_limpio");
      XLSX.writeFile(wb, "dataset_limpio.xlsx");
    } finally {
      setTimeout(() => setIsDownloadingDataset(false), 400);
    }
  };

  const getOptionFromSerialized = (chart: any) => {
    const palette = ["#1E88E5", "#E53935", "#43A047", "#FB8C00", "#8E24AA", "#00897B", "#6D4C41", "#3949AB", "#D81B60", "#546E7A"];
    const grid = { left: 55, right: 25, top: 55, bottom: 55 };
    if (chart.type === "heatmap") {
      const cols: string[] = chart.payload?.cols ?? [];
      const matrix: number[][] = chart.payload?.matrix ?? [];
      const data: [number, number, number][] = [];
      for (let i = 0; i < cols.length; i++) {
        for (let j = 0; j < cols.length; j++) data.push([i, j, Number((matrix[i]?.[j] ?? 0).toFixed(3))]);
      }
      return {
        animation: false,
        color: palette,
        title: { text: chart.title, left: "center", textStyle: { fontSize: 14 } },
        grid,
        xAxis: { type: "category", data: cols, axisLabel: { rotate: 25 } },
        yAxis: { type: "category", data: cols },
        visualMap: { min: -1, max: 1, orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["#E3F2FD", "#90CAF9", "#42A5F5", "#1E88E5", "#0D47A1"] } },
        series: [{ type: "heatmap", data, label: { show: true, formatter: "{c}" } }],
      };
    }

    if (chart.type === "bar") {
      const rows = chart.payload ?? [];
      return {
        animation: false,
        color: palette,
        title: { text: chart.title, left: "center", textStyle: { fontSize: 14 } },
        grid,
        xAxis: { type: "category", data: rows.map((r: any) => r.name ?? r.variable ?? ""), axisLabel: { rotate: 25 } },
        yAxis: { type: "value" },
        series: [{
          type: "bar",
          data: rows.map((r: any, i: number) => ({
            value: r.value ?? r.media ?? 0,
            itemStyle: { color: palette[i % palette.length] },
          })),
        }],
      };
    }

    if (chart.type === "scatter") {
      const raw = chart.payload?.points ?? chart.payload ?? [];
      const points = raw
        .map((p: any) => (Array.isArray(p) ? p : [p?.x, p?.y]))
        .filter((p: any[]) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      return {
        animation: false,
        color: palette,
        title: { text: chart.title, left: "center", textStyle: { fontSize: 14 } },
        grid,
        xAxis: { type: "value" },
        yAxis: { type: "value" },
        series: [{ type: "scatter", symbolSize: 8, itemStyle: { color: "#8E24AA" }, data: points }],
      };
    }

    if (chart.type === "line") {
      const rows = (chart.payload ?? [])
        .map((r: any) => [r?.x, r?.y])
        .filter((p: any[]) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      return {
        animation: false,
        color: palette,
        title: { text: chart.title, left: "center", textStyle: { fontSize: 14 } },
        grid,
        xAxis: { type: "value" },
        yAxis: { type: "value" },
        series: [{
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: "#1E88E5" },
          itemStyle: { color: "#1E88E5" },
          areaStyle: { color: "rgba(30,136,229,0.12)" },
          data: rows,
        }],
      };
    }

    if (chart.type === "boxplot") {
      const stats = chart.payload ?? [];
      return {
        animation: false,
        title: { text: chart.title, left: "center", textStyle: { fontSize: 14 } },
        grid,
        color: palette,
        xAxis: { type: "category", data: stats.map((s: any) => s.variable ?? "") },
        yAxis: { type: "value" },
        series: [
          {
            type: "boxplot",
            data: stats.map((s: any) => s.vals ?? []),
            itemStyle: {
              color: "auto",
              borderColor: "#1e3a8a",
              borderWidth: 2,
            },
            emphasis: {
              itemStyle: {
                color: "#60a5fa",
                borderColor: "#0d47a1",
                borderWidth: 2,
              },
            },
            lineStyle: {
              color: "#1e3a8a",
              width: 1.5,
            },
          },
        ],
      };
    }

    return { series: [] };
  };

  const renderChartToImage = async (chart: any): Promise<string> => {
    const temp = document.createElement("div");
    temp.style.width = "920px";
    temp.style.height = "500px";
    temp.style.position = "fixed";
    temp.style.left = "-99999px";
    temp.style.top = "0";
    document.body.appendChild(temp);

    const instance = echarts.init(temp);
    instance.setOption(getOptionFromSerialized(chart), true);
    instance.resize();
    await new Promise((resolve) => setTimeout(resolve, 280));
    const url = instance.getDataURL({
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      type: "png",
    });
    instance.dispose();
    document.body.removeChild(temp);
    return url;
  };

  const imageToDataUrl = (src: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No se pudo crear contexto de canvas"));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("No se pudo cargar logo"));
      img.src = src;
    });

  const downloadChartsPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const totalPages = serializedCharts.length + 1;
      let logoDataUrl = "";
      try {
        logoDataUrl = await imageToDataUrl(logoCentralData);
      } catch {
        logoDataUrl = "";
      }

      pdf.setFillColor(22, 68, 114);
      pdf.rect(0, 0, pageW, 30, "F");
      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, "PNG", pageW - 68, 6, 52, 18, undefined, "FAST");
      }
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text("Reporte Analitico de Graficos", 14, 18);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(`Fecha: ${new Date().toLocaleString()}`, 14, 40);
      pdf.text(`Registros: ${datos.length}`, 14, 46);
      pdf.text(`Graficos seleccionados: ${serializedCharts.length}`, 14, 52);
      pdf.setFontSize(9);
      pdf.text(`Pagina 1 de ${totalPages}`, pageW - 38, pageH - 6);

      for (let i = 0; i < serializedCharts.length; i++) {
        const chart = serializedCharts[i];
        const img = await renderChartToImage(chart);
        pdf.addPage();

        if (logoDataUrl) {
          pdf.addImage(logoDataUrl, "PNG", pageW - 52, 6, 36, 12, undefined, "FAST");
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(`${i + 1}. ${chart.title}`, 12, 14);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Tipo: ${chart.type}`, 12, 20);

        const margin = 12;
        const imgX = margin;
        const imgY = 28;
        const imgW = pageW - margin * 2;
        const imgH = 130;
        pdf.addImage(img, "PNG", imgX, imgY, imgW, imgH, undefined, "FAST");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(`Pagina ${i + 2} de ${totalPages}`, pageW - 38, pageH - 6);
      }

      pdf.save("reporte_graficos.pdf");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!connection.isConnected) {
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
        <Box
          sx={{
            maxWidth: 500,
            width: "100%",
            borderRadius: 4,
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            textAlign: "center",
            p: 4,
            bgcolor: "#fff",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#0f172a" }}>
            No hay datos cargados
          </Typography>
          <Typography sx={{ color: "#64748b", mb: 3 }}>
            Debes cargar un dataset para acceder a los reportes de limpieza y gráficos.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/CargarDatos")}
            sx={{ bgcolor: "#4338ca", fontWeight: 700, borderRadius: 2, px: 3, "&:hover": { bgcolor: "#312e81" } }}
          >
            Ir a Cargar Datos
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: "#f7f9fb", minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        Reportes de Limpieza
      </Typography>

      {!isDatasetCleaned ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Aun no hay limpieza aplicada. Ejecuta limpieza para habilitar descarga.
        </Alert>
      ) : (
        <Alert severity="success" sx={{ mb: 3 }}>
          Dataset limpio disponible para descarga ({datos.length} registros).
        </Alert>
      )}

      <Button
        variant="contained"
        disabled={!isDatasetCleaned || !datos || datos.length === 0 || isDownloadingDataset || isDownloadingPdf}
        onClick={downloadCleanedDataset}
      >
        {isDownloadingDataset ? "Cargando descarga..." : "Descargar dataset limpio (Excel)"}
      </Button>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Confirmacion de graficos incluidos
        </Typography>
        {serializedCharts.length === 0 ? (
          <Alert severity="info">No hay graficos seleccionados desde la seccion Graficos.</Alert>
        ) : (
          <Alert severity="success">
            Se incluiran {serializedCharts.length} grafico(s): {serializedCharts.map((c) => c.title).join(" | ")}
          </Alert>
        )}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            disabled={serializedCharts.length === 0 || isDownloadingPdf || isDownloadingDataset}
            onClick={downloadChartsPdf}
          >
            {isDownloadingPdf ? "Cargando PDF..." : "Generar PDF con graficos seleccionados"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Reportes;
