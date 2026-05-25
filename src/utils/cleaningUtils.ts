export type ImputationMethod = "mean" | "median" | "mode" | "delete_row" | "ignore";

export interface ColumnStats {
  nombre: string;
  tipo: string;
  total: number;
  nullCount: number;
  nullPercent: number;
  duplicateCount: number;
  duplicatePercent: number;
  mean?: number;
  median?: number;
  mode?: any;
  variance?: number;
  suggestedMethod: ImputationMethod;
}

export interface CleaningOptions {
  normalizeText?: boolean;
}

export const isYearColumn = (columnName: string) =>
  /(anio|año|year)/i.test(columnName);

export const isNull = (v: any) =>
  v === null || v === undefined || v === "" || String(v).trim() === "";

const isNumericValue = (v: any) => {
  if (isNull(v)) return false;
  if (typeof v === "number") return Number.isFinite(v);
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n);
};

const toNumeric = (v: any) => {
  if (typeof v === "number") return v;
  return Number(String(v).trim().replace(",", "."));
};

const normalizeTextValue = (v: any) => {
  if (typeof v !== "string") return v;
  return v.trim().toLowerCase();
};

export const calcMean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

export const calcMedian = (arr: number[]) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const calcMode = (arr: any[]) => {
  const freq = new Map<string, { value: any; count: number }>();
  arr.forEach((v) => {
    const key = JSON.stringify(v);
    const current = freq.get(key);
    freq.set(key, { value: v, count: (current?.count ?? 0) + 1 });
  });

  return [...freq.values()].sort((a, b) => b.count - a.count)[0]?.value;
};

export const calcVariance = (arr: number[], mean: number) =>
  arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;

export function analyzeDataset(data: any[], variables: any[]): ColumnStats[] {
  return variables.map((v) => {
    const values = data.map((r) => r[v.nombre]);
    const nullCount = values.filter(isNull).length;
    const valid = values.filter((x) => !isNull(x));

    const distinct = new Set(valid.map((item) => JSON.stringify(item)));
    const duplicateCount = Math.max(valid.length - distinct.size, 0);

    const stats: ColumnStats = {
      nombre: v.nombre,
      tipo: v.tipo,
      total: values.length,
      nullCount,
      nullPercent: values.length ? (nullCount / values.length) * 100 : 0,
      duplicateCount,
      duplicatePercent: valid.length ? (duplicateCount / valid.length) * 100 : 0,
      suggestedMethod: "mode",
    };

    const isYearLike = isYearColumn(v.nombre);
    const numericValues = valid.filter(isNumericValue).map(toNumeric);
    const mostlyNumeric = numericValues.length > 0 && numericValues.length / Math.max(valid.length, 1) >= 0.8;

    if (!isYearLike && (v.tipo === "number" || mostlyNumeric)) {
      if (numericValues.length > 0) {
        stats.mean = calcMean(numericValues);
        stats.median = calcMedian(numericValues);
        stats.mode = calcMode(numericValues);
        stats.variance = calcVariance(numericValues, stats.mean);
      }
      stats.suggestedMethod = (stats.variance ?? 0) > 50 || stats.duplicatePercent > 35 ? "median" : "mean";
    } else {
      stats.mode = calcMode(valid.map(normalizeTextValue));
      stats.suggestedMethod = "mode";
    }

    if (isYearLike) {
      stats.suggestedMethod = "ignore";
      delete stats.mean;
      delete stats.median;
      delete stats.mode;
      delete stats.variance;
    }

    return stats;
  });
}

export function normalizeDatasetText(data: any[]) {
  return data.map((row) => {
    const next: Record<string, any> = {};
    Object.keys(row).forEach((key) => {
      next[key] = normalizeTextValue(row[key]);
    });
    return next;
  });
}

export function applyImputation(data: any[], column: ColumnStats, method: ImputationMethod, options?: CleaningOptions) {
  if (method === "ignore") return options?.normalizeText ? normalizeDatasetText(data) : data;

  let workingData = options?.normalizeText ? normalizeDatasetText(data) : data;

  if (method === "delete_row") {
    return workingData.filter((row) => !isNull(row[column.nombre]));
  }

  let fillValue: any = null;
  if (method === "mean") fillValue = column.mean ?? null;
  if (method === "median") fillValue = column.median ?? null;
  if (method === "mode") fillValue = column.mode ?? null;

  return workingData.map((row) =>
    isNull(row[column.nombre]) ? { ...row, [column.nombre]: fillValue } : row
  );
}
