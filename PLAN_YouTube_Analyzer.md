# Plan: Analizador de Videos de YouTube con Gemini AI

## Resumen del Proyecto
Aplicación Next.js que permite analizar cualquier video de YouTube usando la API de Gemini para extraer automáticamente libros, fuentes y referencias mencionadas. Ideal para videos educativos de canales como Migala, pero funciona con cualquier contenido.

**Características principales**:
- 🎥 Análisis inteligente en 2 pasos (extracción + verificación web)
- 🔐 Sistema de autenticación de 3 niveles con límites configurables
- 💾 Tracking de uso con Vercel KV (Redis)
- 🌙 Dark mode, búsqueda en tiempo real, export a PDF
- ⚡ Segmentación automática para videos largos (5+ horas)

## Hallazgos de Investigación

### Capacidades de Gemini API
- ✅ Puede analizar videos de YouTube directamente mediante URLs
- ✅ Soporta videos públicos (Migala es público)
- ✅ Gemini 2.5 Flash y Pro disponibles
- ⚠️ **Limitación crítica**: Videos de hasta **3 horas** con resolución baja, **1 hora** con resolución normal
- Los videos de Migala (5+ horas) **requieren dividirse en segmentos**

### Costos (basados en investigación de enero 2026)

**Tier Gratuito (Google AI Studio):**
- Input/Output: **GRATIS**
- Límite: Máximo 8 horas de video de YouTube por día
- **Recomendado para compartir con amigos**: Cada usuario puede usar su propia API key gratuita

**Tier de Pago (si se excede el gratuito):**
- Gemini 2.5 Flash: $0.30/1M tokens input, $2.50/1M output
- Consumo de video (resolución baja): ~100 tokens/segundo
- Google Search Grounding: Primeras 1,500 requests/día gratis, luego $35/1,000 prompts
- **Ejemplo**: Video de 5 horas = ~1.8M tokens = ~$0.54 USD input + output mínimo

**Costos con Estrategia de 2 Pasos (Análisis + Search Grounding):**
| Escenario | Paso 1: Video | Paso 2: Grounding | Total (tier pago) | Total (tier gratuito) |
|-----------|---------------|-------------------|-------------------|------------------------|
| Video 1h, 10 refs | 360K tokens | 10 requests | ~$0.11 + $0.00 = $0.11 | **$0.00** |
| Video 5h, 20 refs | 1.8M tokens | 20 requests | ~$0.54 + $0.00 = $0.54 | **$0.00** |
| Video 5h, 50 refs | 1.8M tokens | 50 requests | ~$0.54 + $0.00 = $0.54 | **$0.00** |

**IMPORTANTE**: Los costos de pago **SOLO aplican si excedes los límites gratuitos**:
- 8 horas de video/día (tier gratuito)
- 500 grounding requests/día (tier gratuito)
- Para uso normal con amigos, **TODO ES GRATIS** 🎉

### Limitaciones Técnicas
- **Vercel AI SDK**: NO tiene soporte nativo para video input
- Solución: Usar SDK de Google directamente (`@google/generative-ai`)
- YouTube URLs están en preview pero funcionan sin costo adicional actualmente

## Arquitectura Propuesta

### Stack Tecnológico
- **Frontend**: Next.js 15 (App Router) con TypeScript
- **Estilo**: Tailwind CSS + shadcn/ui para UI bonita
- **Tema**: next-themes para dark mode
- **API**: Google Generative AI SDK (`@google/generative-ai`)
- **Storage Local**: localStorage para historial y credenciales
- **Storage Remoto**: Vercel KV (Redis) para tracking de uso
- **Exportación**: jsPDF para generar PDFs
- **Deployment**: Vercel (con variables de entorno)

### Estructura del Proyecto
```
youtube-analyzer/
├── app/
│   ├── page.tsx                    # Página principal
│   ├── layout.tsx                  # Layout con ThemeProvider
│   └── api/
│       ├── analyze/
│       │   └── route.ts            # API route principal (análisis en 2 pasos)
│       └── admin/
│           └── usage/
│               └── route.ts        # Estadísticas de uso (admin)
├── components/
│   ├── AuthSelector.tsx            # Selector de método de autenticación
│   ├── VideoInput.tsx              # Form para ingresar URL
│   ├── AnalysisResults.tsx         # Mostrar libros/fuentes con badges
│   ├── HistoryList.tsx             # Historial de análisis con búsqueda
│   ├── UsageBanner.tsx             # Mostrar uso diario (para amigos)
│   ├── PDFExport.tsx               # Botón de exportar
│   └── ThemeToggle.tsx             # Toggle dark/light mode
├── lib/
│   ├── gemini.ts                   # Cliente de Gemini + Google Search grounding
│   ├── video-splitter.ts           # Lógica para dividir videos largos
│   ├── youtube.ts                  # Helpers de YouTube (extract ID, duración)
│   ├── usage-tracker.ts            # Vercel KV para tracking
│   ├── storage.ts                  # Manejo de localStorage
│   ├── types.ts                    # TypeScript interfaces
│   └── prompt.ts                   # Templates de prompts
└── .env.local                      # Variables de entorno
```

## Flujo de Implementación

### 1. Setup Inicial
- Crear proyecto Next.js con TypeScript
- Instalar dependencias:
  - `@google/generative-ai`
  - shadcn/ui components
  - jsPDF para exportación
- Configurar variables de entorno

### 2. Backend (API Route)
**Archivo**: `app/api/analyze/route.ts`

**Funcionalidad**:
- Recibir URL de YouTube y configuración (resolución, segmentos)
- Validar que el video sea público
- **Para videos >3 horas**: Dividir en segmentos usando `videoMetadata` con offsets
- Hacer múltiples llamadas a Gemini API si es necesario
- Prompt optimizado para extraer:
  - Títulos de libros con autor
  - Papers académicos
  - Artículos y fuentes web
  - Timestamps donde se mencionan
- Combinar resultados de múltiples segmentos
- Retornar JSON estructurado

**Estrategia de 2 Pasos para Mayor Precisión**:

**Paso 1 - Extracción inicial del video**:
```
Analiza este video y extrae TODAS las referencias mencionadas, incluso si están incompletas:
1. Menciones de libros (aunque sea parcial: "ese libro de Camus")
2. Papers o estudios académicos
3. Artículos y fuentes web
4. Autores citados
5. Conceptos filosóficos con autor

Para cada mención, incluye:
- Texto exacto como se menciona en el video
- Timestamp aproximado (MM:SS)
- Contexto breve

Formato JSON:
{
  "rawMentions": [
    {
      "type": "book|paper|author|concept",
      "rawText": "texto exacto del video",
      "context": "breve contexto",
      "timestamp": "MM:SS"
    }
  ]
}
```

**Paso 2 - Completar con Google Search Grounding**:
Por cada mención incompleta, hacer request con grounding:
```python
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=f"Encuentra el título completo, autor y año del libro: '{rawMention}'",
    config=GenerateContentConfig(
        tools=[Tool(google_search=GoogleSearch())],
        temperature=1.0
    ),
)
```

**Resultado final**:
```json
{
  "books": [
    {
      "rawMention": "ese libro de Camus sobre el absurdo",
      "fullTitle": "El mito de Sísifo",
      "author": "Albert Camus",
      "year": "1942",
      "timestamp": "15:32",
      "confidence": "high",
      "searchQuery": "libro Camus absurdo",
      "sources": ["wikipedia.org", "goodreads.com"]
    }
  ]
}
```

**Ventajas de este enfoque**:
- ✅ Maneja menciones parciales ("el filósofo del martillo" → Friedrich Nietzsche)
- ✅ Verifica con fuentes reales de internet
- ✅ Incluye metadatos (año, fuentes) que el video no menciona
- ✅ Nivel de confianza para cada match
- ✅ Útil para videos de Migala donde no siempre dicen títulos completos

### 3. Frontend Components

**VideoInput.tsx**:
- Input para URL de YouTube con validación
- Toggle: Modo automático vs. Análisis personalizado
- **Modo personalizado**: Inputs para rangos de tiempo (HH:MM:SS)
- Opciones: resolución (baja por defecto)
- Botón de análisis con loading state y progreso
- Estimación de tokens y tiempo

**AnalysisResults.tsx**:
- Tabs para: Libros, Papers, Fuentes Web, Autores
- Cards bonitos para cada referencia
- Click para copiar título/autor
- **Timestamps clickables**: Enlace directo a YouTube (formato `&t=XXXs`)
- Barra de búsqueda para filtrar resultados en tiempo real

**HistoryList.tsx**:
- Lista de análisis previos (localStorage)
- **Búsqueda en historial**: Filtrar por título de libro, autor, nombre de video
- Filtrar por fecha
- Re-cargar análisis anteriores
- Borrar individual o limpiar todo el historial

**PDFExport.tsx**:
- Generar PDF bonito con todas las referencias
- Incluir: título del video, fecha de análisis, lista organizada
- Logo/branding opcional

### 4. Manejo de Videos Largos

**Estrategia**: Ofrecer ambos modos (automático por defecto, manual disponible)

**Modo Automático** (por defecto):
1. Dividir video en chunks de 2.5 horas
2. Hacer requests secuenciales con progreso en tiempo real
3. Combinar y deduplicar resultados
4. Barra de progreso mostrando: "Analizando segmento 2 de 3..."

```typescript
// Pseudo-código
const videoDuration = 5 * 3600; // 5 horas en segundos
const chunkSize = 2.5 * 3600;   // 2.5 horas
const chunks = Math.ceil(videoDuration / chunkSize); // 2 chunks

for (let i = 0; i < chunks; i++) {
  const startOffset = i * chunkSize;
  const endOffset = Math.min((i + 1) * chunkSize, videoDuration);

  updateProgress(`Analizando segmento ${i + 1} de ${chunks}`);
  await analyzeSegment(videoUrl, startOffset, endOffset);
}
```

**Modo Manual/Selectivo**:
- Toggle "Análisis personalizado"
- Inputs para tiempo inicio/fin (formato HH:MM:SS)
- Botón "Agregar segmento" para múltiples rangos
- Útil para analizar solo partes específicas y ahorrar tokens

### 5. localStorage Schema

```typescript
interface Analysis {
  id: string;
  videoUrl: string;
  videoTitle: string;
  channel: string;
  analyzedAt: Date;
  duration: number;
  results: {
    books: Book[];
    papers: Paper[];
    webSources: WebSource[];
    authors: Author[];
  };
}

interface Book {
  title: string;
  author: string;
  timestamp?: string;
  googleBooksUrl?: string;
}
```

### 6. Optimizaciones y Features

**Para reducir costos**:
- Usar resolución baja por defecto (100 tokens/segundo vs 300)
- Context caching para videos analizados recientemente
- Prompt conciso pero efectivo
- Deduplicación inteligente al combinar segmentos

**Features confirmados (v1)**:
- ✅ **Dark mode**: Usar next-themes + Tailwind dark variant
- ✅ **Timestamps clickables**: Generar URLs como `youtube.com/watch?v=ID&t=XXXs`
- ✅ **Búsqueda en historial**: Filtrar análisis previos por cualquier campo
- ✅ **Modos de segmentación**: Automático y manual
- ✅ **Deployment en Vercel**: Configurar variables de entorno en dashboard

## Sistema de Autenticación de 3 Niveles 🔐

### Nivel 1: API Key Personal del Usuario
- Usuario pega su propia API key de Gemini
- **Sin límites** de tu parte
- **Gratis** para ti
- Se guarda en localStorage

### Nivel 2: Contraseña para Amigos 👥
- Contraseña compartida para grupo de amigos
- **Límite: 8 horas/día compartidas** entre todos
- Usa tier gratuito de tu API key de Gemini
- Tracking con Vercel KV (Redis)
- Si se pasan: "Ya gastaron las 8 horas del día, vuelvan mañana 😅"
- Se guarda en localStorage (no la tienen que escribir cada vez)

### Nivel 3: Contraseña de Dueño (Tú) 👑
- Tu contraseña personal secreta
- **Sin límites** de uso
- Puede usar tier de pago si excedes 8h/día
- Para tu uso personal ilimitado
- Se guarda en localStorage

### Variables de Entorno
```bash
# .env.local (desarrollo)
GEMINI_API_KEY=tu_api_key_de_gemini
FRIENDS_PASSWORD=contraseña_para_amigos_123
OWNER_PASSWORD=tu_password_ultra_secreta_999

# Vercel KV (auto-configuradas al crear KV database)
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

### Flujo de Autenticación
```
Usuario abre app
    ↓
¿Hay credenciales en localStorage?
    ├─ Sí → Auto-cargar
    └─ No → Mostrar selector
         ↓
    [1] Mi API Key
    [2] Contraseña compartida
         ↓
    Usuario selecciona modo
         ↓
    Credencial se guarda en localStorage
         ↓
    Próxima visita: auto-login
```

## Verificación

### Testing End-to-End
1. **Setup inicial**:
   - Crear cuenta en Google AI Studio
   - Generar API key gratuita
   - Pegar en la app (o en .env.local para desarrollo)

2. **Caso 1 - Video corto** (ej: video de Migala de 1 hora):
   - Pegar URL de YouTube
   - Modo automático, resolución baja
   - Click "Analizar"
   - Verificar que extraiga libros/fuentes correctamente
   - Probar timestamps clickables (deben abrir YouTube en ese momento)
   - Buscar un libro específico en los resultados

3. **Caso 2 - Video largo** (ej: video de 5+ horas):
   - Modo automático
   - Verificar que muestre progreso: "Analizando segmento 2 de 3..."
   - Esperar a que combine todos los resultados
   - Verificar que no haya duplicados

4. **Caso 3 - Análisis personalizado**:
   - Cambiar a modo personalizado
   - Ingresar rango: 01:30:00 - 02:00:00
   - Analizar solo esa sección
   - Verificar que solo extraiga referencias de ese segmento

5. **Persistencia y búsqueda**:
   - Recargar la página
   - Verificar que el análisis esté en el historial
   - Usar búsqueda en historial para encontrar un libro específico
   - Cargar análisis anterior

6. **Dark mode**:
   - Toggle dark/light mode
   - Verificar que todos los componentes se vean bien en ambos

7. **Export PDF**:
   - Click "Exportar a PDF"
   - Verificar formato del documento
   - Verificar que incluya todas las secciones

8. **Deployment en Vercel**:
   - Visitar URL de producción
   - Probar desde móvil
   - Verificar que funcione sin .env.local (usando key del usuario)

### Casos de Prueba
- ✅ Video corto (<1 hora) - modo automático
- ✅ Video mediano (1-3 horas) - modo automático
- ✅ Video largo (5+ horas) - segmentación automática
- ✅ Análisis personalizado con rangos específicos
- ✅ Video sin referencias obvias (verificar respuesta vacía/mínima)
- ✅ URL inválida (error handling)
- ✅ Video privado/no listado (error de Gemini)
- ✅ Límite de 8 horas/día alcanzado (mensaje claro al usuario)
- ✅ Búsqueda en historial (filtrar por libro, autor, video)
- ✅ Dark mode en todos los componentes
- ✅ Timestamps clickables llevan a YouTube correctamente
- ✅ Export PDF con contenido correcto

## Archivos Críticos (Checklist de Implementación)

### Backend (API Routes)
- [ ] `app/api/analyze/route.ts` - API principal con auth de 3 niveles + análisis en 2 pasos
- [ ] `app/api/admin/usage/route.ts` - Estadísticas de uso (opcional)

### Libraries Core
- [ ] `lib/gemini.ts` - Cliente Gemini + Google Search grounding
- [ ] `lib/usage-tracker.ts` - Vercel KV para tracking (3 niveles)
- [ ] `lib/video-splitter.ts` - Segmentación automática de videos largos
- [ ] `lib/youtube.ts` - Helpers de YouTube (ID, duración, validación)
- [ ] `lib/storage.ts` - localStorage para historial y credenciales
- [ ] `lib/types.ts` - TypeScript interfaces completas
- [ ] `lib/prompt.ts` - Templates de prompts optimizados

### Frontend Components
- [ ] `components/AuthSelector.tsx` - Selector de 3 niveles de auth + localStorage
- [ ] `components/VideoInput.tsx` - Form con modo auto/custom + progress
- [ ] `components/AnalysisResults.tsx` - Display con badges, búsqueda, timestamps
- [ ] `components/UsageBanner.tsx` - Mostrar uso diario (solo amigos)
- [ ] `components/HistoryList.tsx` - Historial con búsqueda
- [ ] `components/PDFExport.tsx` - Generación de PDF
- [ ] `components/ThemeToggle.tsx` - Dark/light mode
- [ ] `app/layout.tsx` - ThemeProvider configurado
- [ ] `app/page.tsx` - Página principal con todos los components

### Configuración
- [ ] `.env.local` - GEMINI_API_KEY, FRIENDS_PASSWORD, OWNER_PASSWORD
- [ ] `next.config.js` - Configuración de Next.js (si necesario)
- [ ] `.gitignore` - Asegurar que .env.local esté ignorado
- [ ] Vercel KV Database creado y conectado
- [ ] Variables de entorno en Vercel Dashboard configuradas

## Consideraciones de Seguridad 🔒

1. **API Keys y Contraseñas**:
   - ✅ API routes ejecutan en SERVIDOR → seguro hardcodear
   - ✅ Variables de entorno SIN `NEXT_PUBLIC_` → no van al cliente
   - ✅ HTTPS automático en Vercel → protege contraseñas en tránsito
   - ✅ Contraseñas en localStorage → solo en navegador del usuario
   - ❌ NUNCA commitear .env.local a Git
   - ❌ NUNCA usar `NEXT_PUBLIC_` para secrets

2. **Rate Limiting**:
   - Vercel KV tracking previene abuso del grupo de amigos (8h/día)
   - Considerar agregar rate limiting por IP si hay abuso extremo
   - Logs de uso para monitorear patrones sospechosos

3. **Validación de Inputs**:
   - Validar formato de URL de YouTube antes de enviar a Gemini
   - Sanitizar inputs del usuario
   - Timeout en requests largos (videos de 5h+)
   - Manejo de errores de Gemini (videos privados, rate limits)

4. **Protección de Contraseñas**:
   - Si muchas personas obtienen la contraseña de amigos → cambiarla
   - Admin dashboard para monitorear uso
   - Considerar rotación periódica de passwords

5. **CORS y CSP** (si usas API key del cliente):
   - No aplicable si todo pasa por API route (recomendado)
   - Si decides llamar Gemini desde cliente → configurar CORS

## Mejoras Futuras (Post-v1) 🔮

### Corto Plazo
- YouTube Data API para obtener duración exacta del video
- Streaming de respuestas (mostrar referencias conforme se encuentran)
- Caché de análisis previos (evitar re-analizar el mismo video)
- Soporte para playlists (analizar múltiples videos en batch)
- Email de notificación cuando análisis largo termine

### Mediano Plazo
- Autenticación real (Clerk/NextAuth) con database
- Compartir análisis vía link único público
- Sugerencias de videos similares basados en análisis
- Integración con Notion/Obsidian para exportar notas
- Comparar múltiples videos (encontrar temas comunes)
- Analytics: libros más mencionados, autores populares

### Largo Plazo
- Extensión de Chrome para analizar desde YouTube directamente
- App móvil (React Native)
- Webhooks para notificar cuando canal favorito sube video nuevo
- AI Assistant que responde preguntas sobre las referencias
- Marketplace de análisis (usuarios comparten análisis públicos)

## Decisiones del Usuario (Confirmadas) ✅

1. **Alcance**: Cualquier video de YouTube (no solo Migala)
2. **Segmentación**: Ambos modos (automático por defecto, manual disponible)
3. **Deployment**: Vercel con variables de entorno
4. **Storage**: Vercel KV (Redis) para tracking de uso
5. **Autenticación**: 3 niveles (API key personal, password amigos con límite 8h, password owner sin límites)
6. **Features v1**:
   - ✅ Dark mode
   - ✅ Timestamps clickables
   - ✅ Búsqueda en historial y resultados
   - ✅ Análisis en 2 pasos (extracción + Google Search grounding)
   - ✅ Badges de confianza (alta/media/baja)
   - ✅ localStorage para credenciales y historial
   - ✅ Export a PDF
7. **Costos**: Tier gratuito de Gemini (8h/día) + Vercel KV free tier (30K requests/mes)

## Resumen Ejecutivo

**Lo que vamos a construir**:
Una aplicación Next.js que analiza cualquier video de YouTube con Gemini AI para extraer libros, papers y referencias mencionadas. Sistema de autenticación de 3 niveles con tracking de uso en Redis.

**Tech Stack**:
- Next.js 15 + TypeScript + Tailwind + shadcn/ui
- Gemini API con Google Search Grounding
- Vercel KV (Redis) para tracking
- localStorage para historial y auth
- Deployment en Vercel

**Timeline estimado**: 8-12 horas de desarrollo total

**Costo operacional**: $0 USD/mes (tier gratuito de Gemini + Vercel KV)

---

## Pasos de Implementación (Orden de Ejecución)

### Fase 1: Setup y Configuración (30 min)
1. Crear proyecto Next.js con TypeScript y Tailwind
   ```bash
   npx create-next-app@latest youtube-analyzer --typescript --tailwind --app
   cd youtube-analyzer
   ```

2. Instalar dependencias:
   ```bash
   npm install @google/generative-ai @vercel/kv
   npx shadcn-ui@latest init
   npm install next-themes jspdf
   ```

3. Configurar shadcn/ui components necesarios:
   ```bash
   npx shadcn-ui@latest add button card input tabs dialog badge progress select toast
   ```

4. Setup next-themes para dark mode en `app/layout.tsx`

5. Crear `.env.local`:
   ```bash
   GEMINI_API_KEY=tu_api_key_aquí
   FRIENDS_PASSWORD=amigos123
   OWNER_PASSWORD=tu_password_secreta
   ```

6. Crear KV Database en Vercel Dashboard:
   - Storage → Create Database → KV
   - Nombre: `youtube-analyzer-usage`
   - Copiar variables de entorno a `.env.local`

### Fase 2: Backend - Core Logic (3-4 horas)

#### 2.1 Usage Tracker con Vercel KV
**Archivo**: `lib/usage-tracker.ts`
```typescript
import { kv } from '@vercel/kv';

// Funciones principales:
- getDailyUsage(group: 'friends' | 'owner'): Promise<number>
- trackUsage(group, durationInSeconds): Promise<void>
- checkDailyLimit(group: 'friends'): Promise<{ allowed, hoursUsed, hoursRemaining }>
- getUsageStats(group, days): Promise<DailyStats[]>
```
- Auto-reset diario con Redis EXPIREAT
- Keys: `usage:friends:2026-01-31`
- Persistencia real (no se pierde en redeploy)

#### 2.2 Gemini Client con Google Search Grounding
**Archivo**: `lib/gemini.ts`
```typescript
// Funciones:
- analyzeVideoSegment(url, apiKey, startOffset?, endOffset?, resolution)
  → Extrae menciones raw del video

- completeReferenceWithSearch(rawMention, context, apiKey)
  → Usa Google Search grounding para completar info
  → Retorna: { fullTitle, author, year, confidence, sources }

- batchCompleteReferences(rawMentions[], apiKey)
  → Procesa múltiples en paralelo (batch de 5)

- parseReferences(geminiResponse)
  → Estructura datos en formato JSON
```

#### 2.3 API Route Principal
**Archivo**: `app/api/analyze/route.ts`

**Flujo completo**:
1. **Autenticación** (3 niveles):
   ```typescript
   if (userApiKey) → authLevel = 'user'
   else if (password === FRIENDS_PASSWORD) → authLevel = 'friends' + verificar límite
   else if (password === OWNER_PASSWORD) → authLevel = 'owner'
   else → 401 Unauthorized
   ```

2. **Verificación de límites** (solo para amigos):
   ```typescript
   const { allowed, hoursUsed } = await checkDailyLimit('friends');
   if (!allowed) → 429 Too Many Requests
   ```

3. **Análisis Paso 1 - Extracción raw**:
   - Segmentar video si >3 horas
   - Extraer menciones con timestamps
   - Retornar progreso

4. **Análisis Paso 2 - Google Search grounding**:
   - Por cada mención, buscar info completa
   - Batch processing (5 a la vez)
   - Asignar confidence: high/medium/low

5. **Post-procesamiento**:
   - Deduplicar resultados
   - Ordenar por timestamp
   - Agrupar por tipo

6. **Tracking de uso**:
   ```typescript
   if (authLevel === 'friends') {
     await trackUsage('friends', videoDuration);
   }
   ```

7. **Respuesta**:
   ```json
   {
     "results": { "books": [...], "papers": [...] },
     "usage": { "hoursUsed": 3.2, "limit": 8, "hoursRemaining": 4.8 }
   }
   ```

#### 2.4 Helpers
**Archivo**: `lib/youtube.ts`
- `extractVideoId(url)`: Extrae ID del video
- `getVideoDuration(url)`: Obtiene duración (YouTube oEmbed o Data API)
- `validateYouTubeUrl(url)`: Valida formato de URL

**Archivo**: `lib/video-splitter.ts`
- `calculateSegments(duration)`: Divide en chunks de 2.5h
- `generateOffsets(segments)`: Calcula start/end offsets

### Fase 3: Frontend - Components (3-4 horas)

#### 3.1 Layout y Tema
**Archivo**: `app/layout.tsx`
- Configurar `ThemeProvider` de next-themes
- Metadata del sitio

**Archivo**: `components/ThemeToggle.tsx`
- Botón sun/moon para dark mode
- Usa `useTheme()` hook

#### 3.2 Autenticación
**Archivo**: `components/AuthSelector.tsx` (~1 hora)
```tsx
// Funcionalidad:
- 2 tabs: "Mi API Key" | "Usar Contraseña"
- Input para API key o contraseña
- Auto-cargar de localStorage al iniciar
- Guardar en localStorage al cambiar
- Botón "Limpiar credenciales"
- Link a Google AI Studio para obtener key gratis
```

#### 3.3 Input de Video
**Archivo**: `components/VideoInput.tsx` (~1 hora)
```tsx
// Funcionalidad:
- Input para URL de YouTube con validación
- Toggle: "Análisis completo" vs "Personalizado"
- Conditional inputs de tiempo (HH:MM:SS) para modo custom
- Select de resolución (normal/baja)
- Botón "Analizar" con estados: idle → loading → success/error
- Progress bar en tiempo real:
  - "Paso 1/2: Analizando video..."
  - "Paso 2/2: Completando referencias... 15/20"
- Estimador de tokens/duración
```

#### 3.4 Resultados
**Archivo**: `components/AnalysisResults.tsx` (~1.5 horas)
```tsx
// Funcionalidad:
- Tabs: Libros | Papers | Fuentes Web | Autores
- Input de búsqueda en tiempo real (filtra por cualquier campo)
- Para cada referencia:
  - Card con:
    · Mención original: "ese libro de Camus"
    · Info completa: "El mito de Sísifo - Albert Camus (1942)"
    · Badge de confianza: Alta (🟢) | Media (🟡) | Baja (🔴)
    · Timestamp clickable → YouTube con &t=XXXs
    · Fuentes de verificación (Wikipedia, Google Books, etc.)
    · Botón copiar con tooltip de confirmación
- Estado vacío: "No se encontraron referencias"
- Loading states durante análisis
```

**Archivo**: `components/UsageBanner.tsx` (~20 min)
```tsx
// Mostrar solo para autenticación de amigos:
- "Uso compartido hoy: 3.2h de 8h"
- Progress bar visual
- "Quedan 4.8 horas para hoy"
- Warning si quedan <2 horas
```

#### 3.5 Historial
**Archivo**: `components/HistoryList.tsx` (~45 min)
```tsx
// Funcionalidad:
- Drawer/Sidebar con análisis previos
- Cada item:
  · Thumbnail del video (YouTube)
  · Título + canal
  · Fecha de análisis
  · Cantidad de referencias encontradas
- Search input para filtrar historial
- Click en item → cargar análisis
- Botones: Delete individual + "Limpiar todo"
- Ordenar por: Más reciente | Más antiguo | Más referencias
```

#### 3.6 Export PDF
**Archivo**: `components/PDFExport.tsx` (~30 min)
```tsx
// Funcionalidad:
- Botón "Exportar a PDF"
- jsPDF genera:
  · Header: Título video, canal, fecha
  · Secciones por tipo (Libros, Papers, etc.)
  · Para cada ref: título, autor, timestamp, fuentes
  · Footer: "Generado con YouTube Analyzer"
- Download automático al generar
```

### Fase 4: Storage y Types (45 min)

**Archivo**: `lib/storage.ts`
```typescript
// localStorage management
interface Analysis {
  id: string;
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  channel: string;
  duration: number;
  analyzedAt: string;
  authMethod: 'user' | 'friends' | 'owner';
  results: {
    books: Book[];
    papers: Paper[];
    webSources: WebSource[];
    authors: Author[];
  };
}

// Funciones:
- saveAnalysis(analysis: Analysis): void
- getHistory(): Analysis[]
- searchHistory(query: string): Analysis[]
- deleteAnalysis(id: string): void
- clearHistory(): void
- getAuthCredentials(): { apiKey?: string, password?: string, mode: string }
- saveAuthCredentials(creds): void
- clearAuthCredentials(): void
```

**Archivo**: `lib/types.ts`
```typescript
// Interfaces principales
interface Book {
  rawMention: string;
  fullTitle: string;
  author: string;
  year?: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
  searchQuery?: string;
  sources: string[];
}

interface Paper {
  rawMention: string;
  fullTitle: string;
  authors: string[];
  year?: string;
  journal?: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}

interface WebSource {
  rawMention: string;
  title: string;
  url: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
}

interface Author {
  name: string;
  context: string;
  timestamp: string;
}

// API Request/Response types
interface AnalyzeRequest {
  videoUrl: string;
  userApiKey?: string;
  accessPassword?: string;
  mode: 'auto' | 'custom';
  segments?: { start: number; end: number }[];
  resolution?: 'normal' | 'low';
}

interface AnalyzeResponse {
  results: {
    books: Book[];
    papers: Paper[];
    webSources: WebSource[];
    authors: Author[];
  };
  usage?: {
    hoursUsed: number;
    limit: number;
    hoursRemaining: number;
  };
  videoTitle: string;
  channel: string;
  duration: number;
}
```

**Archivo**: `lib/prompt.ts`
```typescript
// Templates de prompts para Gemini

export const STEP1_PROMPT = `
Analiza este video y extrae TODAS las referencias mencionadas...
[Prompt detallado para extracción raw]
`;

export const STEP2_PROMPT = (rawMention: string, context: string) => `
Encuentra el título completo, autor y año para: "${rawMention}"
Contexto: ${context}
[Prompt para Google Search grounding]
`;
```

### Fase 5: Admin Dashboard (Opcional, 30 min)

**Archivo**: `app/api/admin/usage/route.ts`
```typescript
// Endpoint protegido para ver estadísticas de uso
GET /api/admin/usage?password=OWNER_PASSWORD

Retorna:
{
  friends: [
    { date: "2026-01-31", hours: 3.2 },
    { date: "2026-01-30", hours: 5.8 },
    ...últimos 30 días
  ]
}
```

### Fase 6: Deployment en Vercel (20 min)

1. **Push a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: YouTube Analyzer"
   git remote add origin <tu-repo>
   git push -u origin main
   ```

2. **Conectar con Vercel**:
   - Importar repositorio
   - Framework Preset: Next.js (auto-detectado)

3. **Crear KV Database** (si no lo hiciste localmente):
   - Storage → Create Database → KV
   - Nombre: `youtube-analyzer-usage`
   - Connect to Project

4. **Configurar Environment Variables**:
   ```
   GEMINI_API_KEY=tu_api_key
   FRIENDS_PASSWORD=password_amigos
   OWNER_PASSWORD=tu_password_secreta
   ```

5. **Deploy**:
   - Click "Deploy"
   - Esperar build (~2 min)

6. **Verificar**:
   - Visitar URL de producción
   - Probar autenticación
   - Probar análisis de video corto

### Fase 7: Testing Completo (1-2 horas)

#### Test 1: Autenticación
- ✅ Modo "Mi API Key" → pegar key → guardar en localStorage → funciona
- ✅ Modo "Contraseña" → password de amigos → guardar → funciona
- ✅ Contraseña de owner → sin límites → funciona
- ✅ Contraseña incorrecta → error 401
- ✅ Recargar página → auto-login con credenciales guardadas
- ✅ Botón "Limpiar credenciales" → limpia localStorage

#### Test 2: Análisis de Video
- ✅ Video corto (<1h) → modo automático → extrae referencias
- ✅ Video mediano (1-3h) → modo automático → funciona
- ✅ Video largo (5h+) → segmentación automática → múltiples requests
- ✅ Modo personalizado → rangos específicos → solo analiza esa parte
- ✅ URL inválida → error claro
- ✅ Video privado → error de Gemini manejado

#### Test 3: Análisis en 2 Pasos
- ✅ Paso 1 extrae menciones raw: "ese libro de Camus"
- ✅ Paso 2 completa con grounding: "El mito de Sísifo - Albert Camus (1942)"
- ✅ Confidence badges: Alta (verde), Media (amarillo), Baja (rojo)
- ✅ Fuentes de verificación incluidas
- ✅ Timestamps clickables → abren YouTube en momento exacto

#### Test 4: Límites de Uso (Amigos)
- ✅ Analizar 3h → "Usaron 3h de 8h"
- ✅ Analizar otras 6h → "Usaron 9h de 8h" → 429 error
- ✅ Esperar al día siguiente → límite reseteado
- ✅ UsageBanner muestra progreso correcto

#### Test 5: Features Adicionales
- ✅ Dark mode → toggle funciona en todos los componentes
- ✅ Búsqueda en resultados → filtra en tiempo real
- ✅ Búsqueda en historial → encuentra análisis previos
- ✅ Export PDF → descarga con formato correcto
- ✅ Historial → guarda y carga análisis previos
- ✅ Delete análisis → elimina del historial

#### Test 6: Producción
- ✅ Deploy en Vercel exitoso
- ✅ Variables de entorno configuradas
- ✅ Vercel KV conectado y funcionando
- ✅ HTTPS funcionando (auto por Vercel)
- ✅ Probar desde móvil → responsive
- ✅ Compartir URL con amigo → puede usar con contraseña
