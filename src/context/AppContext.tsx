import { createContext, useContext, useState, type ReactNode } from 'react';

// Tipos
export interface Variable {
  nombre: string;
  tipo: string;
  nullable: boolean;
}

export interface ConnectionState {
  isConnected: boolean;
  url: string;
  nombre: string;
  lastUpdate: Date | null;
}

export interface SerializedChart {
  id: string;
  title: string;
  type: string;
  payload: any;
}

interface AppContextType {
  // Estado de conexión
  connection: ConnectionState;
  setConnection: (connection: ConnectionState) => void;
  
  // Variables disponibles
  variables: Variable[];
  setVariables: (variables: Variable[]) => void;
  
  // Variables seleccionadas
  selectedVariables: string[];
  setSelectedVariables: (variables: string[]) => void;
  addSelectedVariable: (variable: string) => void;
  removeSelectedVariable: (variable: string) => void;
  
  // Datos cargados
  datos: any[];
  setDatos: (datos: any[]) => void;
  originalDatos: any[] | null;
  setOriginalDatos: (datos: any[] | null) => void;
  updateDatosFromSource: (datos: any[]) => void;
  markDatasetCleaned: () => void;
  resetCleaningState: () => void;
  isDatasetCleaned: boolean;
  serializedCharts: SerializedChart[];
  setSerializedCharts: (charts: SerializedChart[]) => void;
  
  // Validaciones
  canProceed: boolean;
  minVariablesRequired: number;
  validationError: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MIN_VARIABLES_REQUIRED = 8;

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Estado de conexión
  const [connection, setConnection] = useState<ConnectionState>({
    isConnected: false,
    url: '',
    nombre: '',
    lastUpdate: null,
  });

  // Variables disponibles
  const [variables, setVariables] = useState<Variable[]>([]);
  
  // Variables seleccionadas
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  
  // Datos
  const [datos, setDatos] = useState<any[]>([]);
  const [originalDatos, setOriginalDatos] = useState<any[] | null>(null);
  const [isDatasetCleaned, setIsDatasetCleaned] = useState(false);
  const [serializedCharts, setSerializedCharts] = useState<SerializedChart[]>([]);

  const updateDatosFromSource = (nextDatos: any[]) => {
    setDatos(nextDatos);
    setOriginalDatos(null);
    setIsDatasetCleaned(false);
    setSerializedCharts([]);
  };

  const markDatasetCleaned = () => {
    setIsDatasetCleaned(true);
  };

  const resetCleaningState = () => {
    setOriginalDatos(null);
    setIsDatasetCleaned(false);
  };

  // Agregar variable seleccionada
  const addSelectedVariable = (variable: string) => {
    setSelectedVariables(prev => {
      if (prev.includes(variable)) return prev;
      return [...prev, variable];
    });
  };

  // Remover variable seleccionada
  const removeSelectedVariable = (variable: string) => {
    setSelectedVariables(prev => prev.filter(v => v !== variable));
  };

  // Validación: mínimo 8 variables
  const validationError = selectedVariables.length < MIN_VARIABLES_REQUIRED 
    ? `Debe seleccionar al menos ${MIN_VARIABLES_REQUIRED} variables (seleccionadas: ${selectedVariables.length})`
    : null;

  const canProceed = connection.isConnected && selectedVariables.length >= MIN_VARIABLES_REQUIRED;

  return (
    <AppContext.Provider
      value={{
        connection,
        setConnection,
        variables,
        setVariables,
        selectedVariables,
        setSelectedVariables,
        addSelectedVariable,
        removeSelectedVariable,
        datos,
        setDatos,
        originalDatos,
        setOriginalDatos,
        updateDatosFromSource,
        markDatasetCleaned,
        resetCleaningState,
        isDatasetCleaned,
        serializedCharts,
        setSerializedCharts,
        canProceed,
        minVariablesRequired: MIN_VARIABLES_REQUIRED,
        validationError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
};
