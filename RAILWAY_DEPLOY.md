# Deploy a Railway - YouTube Analyzer

## Pasos de Deploy

### 1. Crear Nuevo Proyecto en Railway

1. Ve a [railway.app](https://railway.app)
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Autoriza Railway a acceder a tu GitHub (si no lo has hecho)
5. Selecciona el repositorio `youtube-analyzer`
6. Railway detectará automáticamente que es Next.js

### 2. Configurar Variables de Entorno

En el dashboard de Railway, ve a **Variables** y agrega:

```bash
# REQUERIDO: API Key de Gemini
GEMINI_API_KEY=tu_api_key_de_gemini

# REQUERIDO: Contraseñas de autenticación
FRIENDS_PASSWORD=tu_password_para_amigos
OWNER_PASSWORD=tu_password_secreta

# OPCIONAL: Redis para tracking de uso
# Si quieres usar Redis, créalo en Railway (ver abajo)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 3. (Opcional) Agregar Upstash Redis para Tracking

Si quieres limitar el uso de amigos a 8h/día:

**Opción A - Usar Upstash (recomendado):**
1. Ve a [upstash.com](https://upstash.com)
2. Crea una base de datos Redis (gratis)
3. Copia `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
4. Agrégalas a las variables de Railway

**Opción B - Redis en Railway:**
1. En tu proyecto de Railway, click **"+ New"**
2. Selecciona **"Database" → "Add Redis"**
3. Railway creará las variables automáticamente
4. **IMPORTANTE**: Necesitarás modificar `lib/usage-tracker.ts` porque Railway usa `REDIS_URL` en lugar de las variables de Upstash

### 4. Deploy

Railway deployará automáticamente:
- Detecta `package.json`
- Ejecuta `npm install`
- Ejecuta `npm run build`
- Inicia con `npm run start`

### 5. Obtener la URL

Una vez deployed:
1. Railway te dará una URL temporal como `youtube-analyzer-production.up.railway.app`
2. Puedes agregar un dominio custom en **Settings → Domains**

## Verificar que Funciona

1. Abre la URL de Railway
2. Prueba con un video corto primero
3. Verifica los logs en Railway si hay errores

## Troubleshooting

### Error: "Cannot find module..."
- Verifica que todas las dependencias estén en `package.json`
- Railway usa Node 18+ por defecto

### Error: Variables de entorno no funcionan
- En Railway, las variables se leen de `process.env` (ya lo hace tu código)
- Verifica que estén configuradas en el tab "Variables"

### Timeout todavía
- Railway NO tiene límite de timeout en requests
- Si sigue pasando, puede ser problema de la API de Gemini
- Verifica los logs: `console.log` aparecerán en Railway

### Redis no funciona
- Si usas Redis de Railway, necesitas modificar `lib/usage-tracker.ts`:
  ```typescript
  // Cambiar de:
  url: process.env.UPSTASH_REDIS_REST_URL
  // A:
  url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
  ```

## Diferencias con Vercel

| Feature | Vercel Free | Railway Free |
|---------|-------------|--------------|
| Timeout | 10s | Sin límite ⭐ |
| Crédito | Ilimitado | $5/mes |
| Build time | 45min | Ilimitado |
| Redis | Integrado | Separado |

## Costos Estimados

Con el plan gratuito de Railway ($5 de crédito/mes):
- **Análisis pequeño** (1-2 min de video): ~0.01¢
- **Análisis mediano** (10 min): ~0.05¢
- **Análisis grande** (1 hora): ~0.20¢

**Estimado**: ~100-200 análisis medianos/mes con $5 gratis

Si se acaba el crédito, Railway te cobrará solo lo que uses (pay-as-you-go).
