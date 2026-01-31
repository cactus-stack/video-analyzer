/**
 * Step 1: Extract raw mentions from video
 * This prompt is designed to catch ALL references, even incomplete ones
 */
export const STEP1_EXTRACTION_PROMPT = `Analiza este video de YouTube y extrae TODAS las referencias mencionadas, incluso si están incompletas o parciales.

Busca y extrae:
1. **Libros** - Incluso menciones parciales como "ese libro de Camus sobre el absurdo", "el libro del martillo" (refiriéndose a Nietzsche), etc.
2. **Papers o estudios académicos** - Estudios científicos, investigaciones, papers citados
3. **Artículos y fuentes web** - Artículos mencionados, blogs, sitios web citados
4. **Autores citados** - Filósofos, escritores, pensadores mencionados aunque no se cite una obra específica
5. **Conceptos filosóficos o teóricos con autor** - Ideas asociadas a autores específicos

Para cada mención, incluye:
- **type**: El tipo de referencia (book, paper, web, author, concept)
- **rawText**: El texto EXACTO como se menciona en el video (no inventes ni completes nada)
- **context**: Contexto breve de por qué se menciona (1-2 oraciones)
- **timestamp**: Tiempo aproximado en formato MM:SS o HH:MM:SS

IMPORTANTE:
- NO intentes completar información que no se menciona explícitamente
- Si solo dicen "Camus", extrae "Camus" (no inventes un título de libro)
- Si dicen "ese filósofo del martillo", extrae exactamente eso
- Captura menciones parciales - el paso 2 las completará
- Incluye el timestamp lo más preciso posible

Retorna SOLO un objeto JSON válido con este formato:
{
  "rawMentions": [
    {
      "type": "book",
      "rawText": "ese libro de Camus sobre el absurdo",
      "context": "Menciona este libro al hablar sobre el existencialismo y el sentido de la vida",
      "timestamp": "15:32"
    },
    {
      "type": "author",
      "rawText": "Nietzsche",
      "context": "Cita a Nietzsche al discutir la moral y los valores",
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
