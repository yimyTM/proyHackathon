// Mock data for TrazaAlimento

export type UserRole = "productor" | "comprador"

export interface User {
  email: string
  name: string
  role: UserRole
}

export interface Insumo {
  nombre: string
  dosis: string
  fecha: string
}

export interface Alerta {
  tipo: string
  descripcion: string
}

export interface Lote {
  id: string
  codigo: string
  cultivo: string
  parcela: string
  cooperativaId: string
  fechaSiembra: string
  fechaCosecha: string
  insumosAplicados: Insumo[]
  condicionesAlmacenamiento: string
  estado: "APTO" | "OBSERVADO" | "NO_APTO"
  alertas: Alerta[]
}

export interface Cooperativa {
  id: string
  nombre: string
  municipio: string
  productos: string[]
  certificada: boolean
  descripcion: string
  contacto: string
}

export interface AlertaSanitaria {
  id: string
  codigo: string
  zona: string
  tipoProblema: string
  descripcion: string
  fecha: string
  estado: "activa" | "resuelta"
  recomendaciones: string[]
}

// Usuarios mock
export const users: User[] = [
  { email: "cooperativa@demo.com", name: "Cooperativa San Julián", role: "productor" },
  { email: "comprador@demo.com", name: "Juan Pérez", role: "comprador" },
]

// Cooperativas
export const cooperativas: Cooperativa[] = [
  {
    id: "coop-1",
    nombre: "Cooperativa Hortícola San Julián",
    municipio: "San Julián",
    productos: ["Tomate", "Pimiento", "Pepino"],
    certificada: true,
    descripcion: "Cooperativa dedicada a la producción de hortalizas de alta calidad con prácticas sostenibles desde 2010.",
    contacto: "info@sanjulian.coop",
  },
  {
    id: "coop-2",
    nombre: "Asociación de Productores Montero",
    municipio: "Montero",
    productos: ["Lechuga", "Zanahoria", "Cebolla"],
    certificada: true,
    descripcion: "Asociación de pequeños productores especializados en cultivos de raíz y hojas verdes orgánicas.",
    contacto: "contacto@prodmontero.org",
  },
  {
    id: "coop-3",
    nombre: "Cooperativa Agroecológica Warnes",
    municipio: "Warnes",
    productos: ["Frutilla", "Melón", "Sandía"],
    certificada: true,
    descripcion: "Productores agroecológicos de frutas frescas con certificación de comercio justo.",
    contacto: "ventas@agrowarnes.bo",
  },
]

// Lotes
export const lotes: Lote[] = [
  {
    id: "lote-1",
    codigo: "SCZ-2024-0341",
    cultivo: "Tomate",
    parcela: "Parcela Norte A-12",
    cooperativaId: "coop-1",
    fechaSiembra: "2024-01-15",
    fechaCosecha: "2024-04-20",
    insumosAplicados: [
      { nombre: "Fertilizante NPK 15-15-15", dosis: "50 kg/ha", fecha: "2024-02-01" },
      { nombre: "Fungicida Mancozeb", dosis: "2.5 kg/ha", fecha: "2024-03-10" },
    ],
    condicionesAlmacenamiento: "Cámara fría a 10°C, humedad relativa 85%",
    estado: "APTO",
    alertas: [],
  },
  {
    id: "lote-2",
    codigo: "SCZ-2024-0342",
    cultivo: "Pimiento",
    parcela: "Parcela Sur B-05",
    cooperativaId: "coop-1",
    fechaSiembra: "2024-01-20",
    fechaCosecha: "2024-05-01",
    insumosAplicados: [
      { nombre: "Insecticida Cipermetrina", dosis: "0.5 L/ha", fecha: "2024-04-25" },
    ],
    condicionesAlmacenamiento: "Ambiente ventilado a temperatura ambiente",
    estado: "OBSERVADO",
    alertas: [
      { tipo: "Período de carencia", descripcion: "Período de carencia insuficiente para Cipermetrina (aplicado 6 días antes de cosecha, mínimo requerido: 14 días)" },
    ],
  },
  {
    id: "lote-3",
    codigo: "SCZ-2024-0343",
    cultivo: "Lechuga",
    parcela: "Parcela Este C-08",
    cooperativaId: "coop-2",
    fechaSiembra: "2024-02-10",
    fechaCosecha: "2024-03-25",
    insumosAplicados: [
      { nombre: "Compost orgánico", dosis: "2 ton/ha", fecha: "2024-02-10" },
    ],
    condicionesAlmacenamiento: "Cámara fría a 4°C, humedad relativa 95%",
    estado: "APTO",
    alertas: [],
  },
  {
    id: "lote-4",
    codigo: "SCZ-2024-0344",
    cultivo: "Zanahoria",
    parcela: "Parcela Oeste D-03",
    cooperativaId: "coop-2",
    fechaSiembra: "2024-01-05",
    fechaCosecha: "2024-04-15",
    insumosAplicados: [
      { nombre: "Herbicida Glifosato", dosis: "4 L/ha", fecha: "2024-03-20" },
      { nombre: "Insecticida Carbofuran", dosis: "1 kg/ha", fecha: "2024-04-01" },
    ],
    condicionesAlmacenamiento: "Bodega seca a 12°C",
    estado: "NO_APTO",
    alertas: [
      { tipo: "Dosis excedida", descripcion: "Dosis de Glifosato excede el límite máximo permitido (máximo 2 L/ha)" },
      { tipo: "Insumo no autorizado", descripcion: "Carbofuran no está autorizado para uso en cultivos alimenticios" },
    ],
  },
]

// Alertas sanitarias
export const alertasSanitarias: AlertaSanitaria[] = [
  {
    id: "alerta-1",
    codigo: "SCZ-AL-001",
    zona: "San Julián",
    tipoProblema: "Plaga",
    descripcion: "Presencia de trips en cultivos de solanáceas",
    fecha: "2024-04-10",
    estado: "activa",
    recomendaciones: [
      "Monitorear presencia de trips con trampas amarillas",
      "Aplicar control biológico con depredadores naturales",
      "Evitar aplicación de insecticidas de amplio espectro",
      "Reportar avistamientos al SENASAG",
    ],
  },
  {
    id: "alerta-2",
    codigo: "SCZ-AL-002",
    zona: "Montero",
    tipoProblema: "Contaminación",
    descripcion: "Contaminación por agroquímico en agua de riego",
    fecha: "2024-03-28",
    estado: "resuelta",
    recomendaciones: [
      "Suspender uso de agua del canal norte temporalmente",
      "Utilizar fuentes alternativas de riego",
      "Realizar análisis de agua antes de reanudar uso",
      "Coordinar con autoridades municipales",
    ],
  },
]

// Municipios disponibles para filtros
export const municipios = ["San Julián", "Montero", "Warnes"]

// Productos disponibles para filtros
export const productosDisponibles = [
  "Tomate",
  "Pimiento", 
  "Pepino",
  "Lechuga",
  "Zanahoria",
  "Cebolla",
  "Frutilla",
  "Melón",
  "Sandía",
]

// Helper functions
export function getLotesByCooperativa(cooperativaId: string): Lote[] {
  return lotes.filter((lote) => lote.cooperativaId === cooperativaId)
}

export function getCooperativaById(id: string): Cooperativa | undefined {
  return cooperativas.find((coop) => coop.id === id)
}

export function getLoteById(id: string): Lote | undefined {
  return lotes.find((lote) => lote.id === id)
}

export function getLoteByCodigo(codigo: string): Lote | undefined {
  return lotes.find((lote) => lote.codigo === codigo)
}
