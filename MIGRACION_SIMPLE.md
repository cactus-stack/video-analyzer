# Migración a Railway - La Versión Super Simple

## ¿Qué vas a hacer?

**REEMPLAZAR Vercel por Railway.** Eso es todo.

## ¿Por qué?

Porque Vercel Free tiene timeout de 10s y Railway no tiene límite.

## Proceso (literalmente 3 pasos)

### 1️⃣ Ve a Railway
- Abre [railway.app](https://railway.app)
- Login con GitHub

### 2️⃣ Crea Proyecto
- Click "New Project"
- Click "Deploy from GitHub repo"
- Selecciona tu repo `youtube-analyzer`
- **Railway hace TODO automáticamente** ✨

### 3️⃣ Agrega Variables de Entorno
En el tab "Variables" del proyecto en Railway:
```
GEMINI_API_KEY=tu_api_key
FRIENDS_PASSWORD=tu_password
OWNER_PASSWORD=tu_password
```

### ✅ Listo!

Railway te dará una URL tipo:
```
https://youtube-analyzer-production.up.railway.app
```

Esa URL es tu app COMPLETA (frontend + backend).

---

## ¿Qué pasa con Vercel?

Puedes:
- **Opción A**: Dejarlo (no pasa nada, solo está ahí sin usar)
- **Opción B**: Borrarlo (si quieres limpiar)
- **Opción C**: Apagar el deploy (Settings → General → Delete Project)

**No necesitas tocar nada en el código para migrar.**

---

## Lo que Railway hace por ti (automático)

```bash
# 1. Detecta Next.js
✓ Found package.json

# 2. Instala dependencias
✓ Running npm install

# 3. Compila TODO (frontend + backend)
✓ Running npm run build
  - Compila React components
  - Compila API routes
  - Optimiza assets

# 4. Inicia el servidor
✓ Running npm run start
  - Sirve frontend en /
  - Sirve API en /api/*

# 5. Te da URL pública
✓ Your app is live at:
  https://youtube-analyzer-production.up.railway.app
```

---

## Diagrama de Arquitectura

### ANTES (Vercel):
```
Usuario → vercel.app → [Frontend + API routes]
                        └─ timeout 10s ❌
```

### DESPUÉS (Railway):
```
Usuario → railway.app → [Frontend + API routes]
                        └─ sin timeout ✅
```

**Es literalmente lo mismo, solo cambias la plataforma.**

---

## ¿Necesitas cambiar algo en el código?

**NO.** El código es exactamente el mismo.

Next.js funciona igual en Railway que en Vercel.

---

## FAQ

**P: ¿Railway puede correr Next.js?**
R: Sí, perfectamente. Detecta el framework automáticamente.

**P: ¿Necesito configurar algo especial?**
R: No, solo las variables de entorno (igual que en Vercel).

**P: ¿Funciona el App Router de Next.js 16?**
R: Sí, 100% compatible.

**P: ¿Y mis API routes en `/api`?**
R: Funcionan exactamente igual.

**P: ¿Puedo usar el mismo repo de GitHub?**
R: Sí, Railway se conecta a GitHub igual que Vercel.

**P: ¿Cuánto cuesta?**
R: $5 gratis/mes, después pay-as-you-go (~$5-10/mes para tu uso).

---

## Siguiente Paso

Solo dime: **"Dale, sube a Railway"** y te guío el proceso en vivo. 🚂
