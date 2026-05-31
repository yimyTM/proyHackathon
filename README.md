# 🌿 TrazaTech — Plataforma Inteligente de Trazabilidad Alimentaria

> **TrazaTech** documenta y comunica la historia de cada lote agrícola para demostrar inocuidad en tiempo real.  
> Conecta cooperativas agrícolas de Santa Cruz, Bolivia con mercados formales mediante trazabilidad verificable, alertas predictivas de riesgos y pasaportes QR por lote.

---

## 🎯 Propósito

Las cooperativas agrícolas de Santa Cruz enfrentan barreras de acceso a mercados formales por falta de documentación fitosanitaria confiable. TrazaTech resuelve esto con:

- **Trazabilidad verificable** — registro digital de insumos, fechas y condiciones de cada lote.
- **Motor de análisis fitosanitario** — evalúa períodos de carencia, dosis de agroquímicos y alertas sanitarias vecinas.
- **Pasaporte QR por lote** — código escaneable con el estado en tiempo real (APTO / ATENCIÓN / NO APTO).
- **Alertas predictivas** — notificaciones vía Telegram cuando un lote entra en zona crítica o es rechazado.

---

## 🏗️ Arquitectura General

```
┌────────────────────────────┐        HTTP/REST        ┌──────────────────────────────┐
│      Frontend (Next.js)    │ ──────────────────────► │     Backend (FastAPI)         │
│   Dashboard · Lotes · QR   │                         │  Motor IA · Alertas · SQLite  │
└────────────────────────────┘                         └──────────────────────────────┘
```

---

## 🖥️ Frontend

**Ruta:** [`/frontend`](./frontend)

### Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16.x | Framework React con App Router |
| [React](https://react.dev/) | 19 | Librería UI |
| [TypeScript](https://www.typescriptlang.org/) | 5.7 | Tipado estático |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Estilos utilitarios |
| [Radix UI](https://www.radix-ui.com/) | múltiple | Componentes accesibles headless |
| [Recharts](https://recharts.org/) | 2.x | Gráficas y visualizaciones |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | — | Formularios con validación |
| [qrcode](https://www.npmjs.com/package/qrcode) | 1.x | Generación de QR en cliente |
| [date-fns](https://date-fns.org/) | 4.x | Manipulación de fechas |
| [Lucide React](https://lucide.dev/) | — | Iconos |

### Estructura de rutas (App Router)

```
frontend/app/
├── page.tsx              # Raíz / redirect
├── layout.tsx            # Layout global (tema, fuentes)
├── globals.css           # Variables CSS y estilos base
├── login/                # Autenticación de usuarios
├── dashboard/            # Vista principal de métricas y resumen
├── lotes/                # Gestión de lotes agrícolas
├── trazabilidad/         # Historial y cadena de trazabilidad
├── alertas/              # Centro de alertas sanitarias
├── cooperativas/         # Administración de cooperativas
├── reportes/             # Generación y descarga de reportes
└── perfil/               # Configuración de cuenta
```

### Ejecución local

```bash
cd frontend
npm install          # o pnpm install
npm run dev          # Servidor en http://localhost:3000
```

---

## ⚙️ Backend

**Ruta:** [`/backend`](./backend)

### Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| [FastAPI](https://fastapi.tiangolo.com/) | ≥0.115 | Framework API asíncrono |
| [Uvicorn](https://www.uvicorn.org/) | ≥0.32 | Servidor ASGI |
| [Pydantic](https://docs.pydantic.dev/) | ≥2.10 | Validación de modelos de datos |
| [SQLAlchemy](https://www.sqlalchemy.org/) | ≥2.0 | ORM (base de datos SQLite) |
| [Google GenAI SDK](https://pypi.org/project/google-genai/) | ≥2.0 | Integración con modelos de IA |
| [qrcode + Pillow](https://pypi.org/project/qrcode/) | ≥8.0 / ≥11.0 | Generación de imágenes QR |
| [httpx](https://www.python-httpx.org/) | ≥0.28 | Cliente HTTP async (Telegram, FCM) |
| [python-dotenv](https://pypi.org/project/python-dotenv/) | ≥1.0 | Variables de entorno |
| [pytest](https://pytest.org/) | ≥8.0 | Testing |

### Módulos principales

| Archivo | Descripción |
|---|---|
| [`main.py`](./backend/main.py) | Punto de entrada FastAPI. Expone los endpoints REST y configura CORS. |
| [`engine.py`](./backend/engine.py) | Motor de análisis fitosanitario. Aplica 6 reglas de negocio para determinar `APTO / ATENCIÓN / NO_APTO`. |
| [`models.py`](./backend/models.py) | Modelos Pydantic: `AnalisisRequest`, `AnalisisResponse`, `InsumoRequest`, `AlertaVecinaRequest`. |
| [`periodos_carencia.py`](./backend/periodos_carencia.py) | Base de conocimiento de agroquímicos: período de carencia, dosis máxima, autorización. |
| [`alertas.py`](./backend/alertas.py) | Envío de notificaciones por Telegram Bot API y Firebase Cloud Messaging (FCM). |
| [`qr_generator.py`](./backend/qr_generator.py) | Genera imagen PNG de QR con el resumen del análisis del lote. |

### Endpoints REST

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/analizar` | Analiza un lote y devuelve estado, alerta, motivos y confianza en JSON. |
| `POST` | `/analizar/qr` | Igual que `/analizar` pero devuelve el QR como imagen `image/png`. |
| `GET` | `/health` | Verificación de salud del servicio. |

### Lógica del motor (engine.py)

El motor aplica **6 reglas** encadenadas sobre cada lote:

1. **Período de carencia incumplido** → `ROJA / NO_APTO` si la cosecha ocurre antes de que termine la carencia del agroquímico.
2. **Zona crítica (20% final)** → `AMARILLA / ATENCIÓN` si la cosecha cae en el último 20% del período de carencia.
3. **Dosis supera máximo permitido** → `ROJA / NO_APTO` con el exceso calculado.
4. **Alertas sanitarias vecinas** → `AMARILLA / ATENCIÓN` si hay un agente fitosanitario a < 10 km en el mismo cultivo.
5. **Historial de rechazos** → penalización de hasta −20% en la confianza.
6. **Test rápido negativo** → bonificación de +15% en la confianza.

### Variables de entorno (`.env`)

```env
TELEGRAM_BOT_TOKEN=<token del bot de Telegram>
GOOGLE_API_KEY=<clave API de Google GenAI>
DATABASE_URL=sqlite:///trazaalimento.db
```

### Ejecución local

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Docs interactivas en http://localhost:8000/docs
```

---

## 🚀 Inicio rápido (full stack)

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd proyHackathon

# 2. Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # configurar variables de entorno
uvicorn main:app --reload --port 8000

# 3. Frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 📁 Estructura del proyecto

```
proyHackathon/
├── README.md
├── backend/
│   ├── main.py               # API FastAPI
│   ├── engine.py             # Motor fitosanitario
│   ├── models.py             # Modelos Pydantic
│   ├── periodos_carencia.py  # Base de conocimiento agroquímicos
│   ├── alertas.py            # Notificaciones (Telegram / FCM)
│   ├── qr_generator.py       # Generador de QR
│   ├── requirements.txt
│   ├── trazaalimento.db      # Base de datos SQLite
│   └── tests/
└── frontend/
    ├── app/                  # Rutas Next.js (App Router)
    ├── components/           # Componentes reutilizables
    ├── hooks/                # Custom hooks
    ├── lib/                  # Utilidades y helpers
    ├── src/                  # Contextos y datos
    ├── styles/               # Estilos adicionales
    └── package.json
```

---

## 🤝 Contribución

1. Crea una rama: `git checkout -b feature/mi-mejora`
2. Realiza tus cambios y asegúrate de que los tests pasen: `pytest backend/tests/`
3. Abre un Pull Request describiendo el cambio.

---

*Desarrollado para conectar cooperativas agrícolas de Santa Cruz con mercados formales — Bolivia 🇧🇴*