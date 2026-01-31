/**
 * Step 1: Extract raw mentions from video
 * This prompt is designed to catch ALL references, even incomplete ones
 */
export const STEP1_EXTRACTION_PROMPT = `Analiza esta transcripción de YouTube y extrae TODAS las referencias mencionadas, incluso si están incompletas o parciales.

Busca y extrae:
1. **Libros** - Títulos de libros, incluso menciones parciales como "ese libro de Camus sobre el absurdo"
2. **Papers o estudios académicos** - Estudios científicos, investigaciones, papers citados
3. **Artículos y fuentes web** - Artículos, blogs, sitios web mencionados
4. **Autores citados** - Filósofos, escritores, pensadores (solo si se mencionan EXPLÍCITAMENTE por nombre)
5. **Conceptos filosóficos** - Ideas o teorías mencionadas

Para cada mención, incluye:
- **type**: El tipo (book, paper, web, author, concept)
- **rawText**: El texto EXACTO como aparece en la transcripción (NO inventes ni completes)
- **context**: Contexto breve (1 oración)
- **timestamp**: Tiempo aproximado en formato MM:SS

REGLAS CRÍTICAS:
❌ NO extraigas palabras sueltas o fragmentos sin sentido ("de les", "jates")
❌ NO extraigas conectores o artículos ("y", "el", "de")
❌ NO combines nombres que se mencionan separados ("adorno y Jorge" → extrae "Adorno" y "Jorge" por separado)
✅ SOLO extrae nombres completos, títulos reconocibles, o conceptos claros
✅ Si mencionan varios autores juntos, extrae cada uno por separado
✅ Verifica que rawText tenga sentido por sí solo

Retorna SOLO un objeto JSON válido:
{
  "rawMentions": [
    {
      "type": "book",
      "rawText": "El mito de Sísifo",
      "context": "Menciona este libro al hablar sobre el absurdo",
      "timestamp": "15:32"
    },
    {
      "type": "author",
      "rawText": "Nietzsche",
      "context": "Cita a Nietzsche al discutir la moral",
      "timestamp": "23:15"
    }
  ]
}`;

/**
 * Step 2: Complete reference with Google Search grounding
 */
export function getStep2CompletionPrompt(rawMention: string, context: string, type: string): string {
  if (type === 'book') {
    return `Encuentra la información completa de este libro basándote en la mención: "${rawMention}"

Contexto: ${context}

INSTRUCCIONES:
- Haz búsquedas web RÁPIDAS (solo título + autor, 3-5 segundos máximo)
- Si no encuentras resultados rápido, usa tu conocimiento interno del libro
- Prioriza VELOCIDAD sobre búsquedas exhaustivas

Necesito:
1. Título completo del libro
2. Autor(es)
3. Año de publicación (si es posible)
4. Enlaces a fuentes confiables (SOLO si los encontraste rápido, sino déjalo vacío)

Retorna SOLO un objeto JSON válido:
{
  "fullTitle": "Título completo del libro",
  "author": "Nombre del autor",
  "year": "1942",
  "sources": ["https://es.wikipedia.org/...", "https://www.goodreads.com/..."]
}

Si no encuentras información suficiente, retorna:
{
  "fullTitle": "${rawMention}",
  "author": "Desconocido",
  "sources": []
}`;
  }

  if (type === 'paper') {
    return `Encuentra la información completa de este paper/estudio académico: "${rawMention}"

Contexto: ${context}

INSTRUCCIONES:
- Haz búsquedas web RÁPIDAS (3-5 segundos máximo)
- Si no encuentras resultados rápido, usa tu conocimiento interno
- Prioriza VELOCIDAD sobre búsquedas exhaustivas

Necesito:
1. Título completo del paper
2. Autores (lista)
3. Año de publicación
4. Revista o journal (si aplica)
5. Enlaces a fuentes (SOLO si los encontraste rápido, sino déjalo vacío)

Retorna SOLO un objeto JSON válido:
{
  "fullTitle": "Título completo",
  "authors": ["Autor 1", "Autor 2"],
  "year": "2020",
  "journal": "Nature",
  "sources": ["https://pubmed.ncbi.nlm.nih.gov/..."]
}`;
  }

  if (type === 'web') {
    return `Encuentra información sobre este artículo o fuente web: "${rawMention}"

Contexto: ${context}

Necesito:
1. Título del artículo
2. URL completo
3. Fuentes relacionadas

Retorna SOLO un objeto JSON válido:
{
  "title": "Título del artículo",
  "url": "https://...",
  "sources": ["https://..."]
}`;
  }

  if (type === 'author' || type === 'concept') {
    return `Encuentra información sobre este autor o concepto: "${rawMention}"

Contexto: ${context}

Necesito:
1. Nombre completo del autor (si es una persona)
2. Descripción breve
3. Obras principales relacionadas con el contexto
4. Fuentes

Retorna SOLO un objeto JSON válido:
{
  "fullName": "Nombre completo",
  "description": "Breve descripción",
  "relatedWorks": ["Obra 1", "Obra 2"],
  "sources": ["https://..."]
}`;
  }

  return `Completa la información sobre: "${rawMention}"\nContexto: ${context}`;
}

/**
 * Fallback prompt if JSON parsing fails
 */
export const JSON_REPAIR_PROMPT = `El siguiente texto debería ser JSON pero tiene errores de formato. Corrige SOLO el formato JSON sin cambiar el contenido:

{TEXT}

Retorna únicamente el JSON corregido, sin explicaciones.`;
