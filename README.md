# YouTube Analyzer con Gemini AI

Aplicación Next.js que permite analizar cualquier video de YouTube usando la API de Gemini para extraer automáticamente libros, fuentes y referencias mencionadas.

## Características Principales

- 🎥 **Análisis inteligente en 2 pasos**: Extracción + verificación web
- 🔐 **Sistema de autenticación de 3 niveles** con límites configurables
- 💾 **Tracking de uso** con Upstash Redis
- 🌙 **Dark mode**, búsqueda en tiempo real, export a PDF
- ⚡ **Segmentación automática** para videos largos (5+ horas)

## Setup Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` con:

```bash
# Tu API key de Gemini (obtén una gratis en https://aistudio.google.com/apikey)
GEMINI_API_KEY=tu_api_key_aquí

# Contraseña para amigos (8 horas/día compartidas)
FRIENDS_PASSWORD=amigos123

# Tu contraseña personal (sin límites)
OWNER_PASSWORD=tu_password_secreta

# Upstash Redis (opcional, para tracking de uso)
# Se configuran automáticamente al conectar un Redis database en Vercel
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Sistema de Autenticación (3 Niveles)

### Nivel 1: API Key Personal
- El usuario pega su propia API key de Gemini
- **Sin límites** de uso
- **Gratis** (tier gratuito de Gemini: 8 horas de video/día)
- Se guarda en localStorage

### Nivel 2: Contraseña para Amigos
- Contraseña compartida para grupo de amigos
- **Límite: 8 horas/día compartidas** entre todos
- Usa el tier gratuito de tu API key
- Tracking con Upstash Redis
- Se guarda en localStorage

### Nivel 3: Contraseña de Dueño
- Tu contraseña personal secreta
- **Sin límites** de uso
- Puede usar tier de pago si excedes 8h/día
- Se guarda en localStorage

## Funcionamiento del Análisis en 2 Pasos

### Paso 1: Extracción Raw
- Gemini analiza el video de YouTube directamente
- Extrae TODAS las menciones, incluso parciales
- Ejemplo: "ese libro de Camus sobre el absurdo"

### Paso 2: Completar con Google Search Grounding
- Para cada mención incompleta, hace búsqueda
- Completa título, autor, año, fuentes
- Asigna nivel de confianza: Alta 🟢 | Media 🟡 | Baja 🔴
- Ejemplo output: "El mito de Sísifo - Albert Camus (1942)"

## Deployment en Vercel

### 1. Push a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <tu-repo>
git push -u origin main
```

### 2. Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio
3. Vercel detectará automáticamente Next.js

### 3. Crear Redis Database (Opcional)

1. En Vercel Dashboard → Storage → Create Database
2. Selecciona **Upstash Redis**
3. Conéctalo a tu proyecto
4. Las variables de entorno se configurarán automáticamente

### 4. Configurar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```
GEMINI_API_KEY=tu_api_key
FRIENDS_PASSWORD=password_amigos
OWNER_PASSWORD=tu_password_secreta
```

### 5. Deploy

Click "Deploy" y espera ~2 minutos.

## Costos

### Tier Gratuito (Recomendado)
- **Input/Output**: GRATIS
- **Límite**: 8 horas de video de YouTube/día
- **Grounding**: Primeras 1,500 requests/día gratis
- **Total**: $0 USD/mes para uso normal

### Tier de Pago (solo si excedes límites gratuitos)
- Gemini 2.0 Flash: $0.30/1M tokens input, $2.50/1M output
- Video (resolución baja): ~100 tokens/segundo
- Ejemplo: Video de 5 horas = ~$0.54 USD

**Para uso compartido con amigos, TODO ES GRATIS 🎉**

## Estructura del Proyecto

```
youtube-analyzer/
├── app/
│   ├── page.tsx                    # Página principal
│   ├── layout.tsx                  # Layout con ThemeProvider
│   └── api/
│       ├── analyze/route.ts        # API principal (análisis en 2 pasos)
│       └── admin/usage/route.ts    # Estadísticas de uso
├── components/
│   ├── AuthSelector.tsx            # Selector de autenticación
│   ├── VideoInput.tsx              # Form para ingresar URL
│   ├── AnalysisResults.tsx         # Mostrar resultados
│   ├── HistoryList.tsx             # Historial con búsqueda
│   ├── UsageBanner.tsx             # Mostrar uso diario
│   ├── PDFExport.tsx               # Exportar a PDF
│   └── ThemeToggle.tsx             # Dark/light mode
├── lib/
│   ├── gemini.ts                   # Cliente de Gemini
│   ├── video-splitter.ts           # Segmentación de videos largos
│   ├── youtube.ts                  # Helpers de YouTube
│   ├── usage-tracker.ts            # Upstash Redis tracking
│   ├── storage.ts                  # localStorage
│   ├── types.ts                    # TypeScript interfaces
│   └── prompt.ts                   # Templates de prompts
└── .env.local                      # Variables de entorno
```

## Limitaciones Conocidas

- Gemini API acepta videos de hasta **3 horas** con resolución baja
- Videos más largos se dividen automáticamente en segmentos
- YouTube Data API no está integrada (duración se estima)

## Mejoras Futuras

- [ ] YouTube Data API para duración exacta
- [ ] Streaming de respuestas en tiempo real
- [ ] Soporte para playlists
- [ ] Integración con Notion/Obsidian
- [ ] Extensión de Chrome
- [ ] App móvil

## Licencia

MIT

## Autor

Creado con ❤️ usando Claude Code
