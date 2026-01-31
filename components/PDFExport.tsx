'use client';

import { jsPDF } from 'jspdf';
import { Analysis } from '@/lib/types';

interface PDFExportProps {
  analysis: Analysis | null;
}

export default function PDFExport({ analysis }: PDFExportProps) {
  if (!analysis) return null;

  const handleExport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Color palette
    const colors = {
      primary: [59, 130, 246] as [number, number, number], // Blue
      secondary: [147, 51, 234] as [number, number, number], // Purple
      accent: [236, 72, 153] as [number, number, number], // Pink
      text: [31, 41, 55] as [number, number, number], // Gray-800
      lightGray: [243, 244, 246] as [number, number, number],
      darkGray: [107, 114, 128] as [number, number, number],
    };

    // ===== COVER PAGE =====
    // Gradient background (simulated with rectangles)
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, pageHeight / 2, 'F');
    doc.setFillColor(...colors.secondary);
    doc.rect(0, pageHeight / 2, pageWidth, pageHeight / 2, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    const title = 'Análisis de Video';
    doc.text(title, pageWidth / 2, 80, { align: 'center' });

    // Video Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    const maxTitleWidth = pageWidth - 40;
    const splitTitle = doc.splitTextToSize(analysis.videoTitle, maxTitleWidth);
    doc.text(splitTitle, pageWidth / 2, 100, { align: 'center' });

    // Channel
    doc.setFontSize(12);
    doc.text(`Canal: ${analysis.channel}`, pageWidth / 2, 120 + (splitTitle.length * 5), { align: 'center' });

    // Date
    const formattedDate = new Date(analysis.analyzedAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(formattedDate, pageWidth / 2, 130 + (splitTitle.length * 5), { align: 'center' });

    // Stats box
    const statsY = 160 + (splitTitle.length * 5);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(40, statsY, pageWidth - 80, 40, 5, 5, 'F');

    doc.setTextColor(...colors.text);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const stats = [
      `${analysis.results.books.length} Libros`,
      `${analysis.results.papers.length} Papers`,
      `${analysis.results.webSources.length} Fuentes Web`,
      `${analysis.results.authors.length} Autores`,
    ];
    const statsX = 60;
    doc.text(stats.join('  •  '), pageWidth / 2, statsY + 25, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(...colors.darkGray);
    doc.text('Generado con YouTube Analyzer', pageWidth / 2, pageHeight - 20, { align: 'center' });

    // ===== CONTENT PAGES =====
    let yPos = 30;

    const addNewPage = () => {
      doc.addPage();
      yPos = 30;
      // Add page header
      doc.setFillColor(...colors.lightGray);
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.setTextColor(...colors.primary);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('YouTube Analyzer', 20, 13);
      doc.setTextColor(...colors.darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text(analysis.videoTitle.substring(0, 60) + '...', pageWidth - 20, 13, { align: 'right' });
      yPos = 35;
    };

    const checkSpace = (needed: number) => {
      if (yPos + needed > pageHeight - 30) {
        addNewPage();
      }
    };

    // Books Section
    if (analysis.results.books.length > 0) {
      addNewPage();

      // Section Header
      doc.setFillColor(...colors.primary);
      doc.rect(20, yPos - 5, pageWidth - 40, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('📚 Libros Mencionados', 25, yPos + 3);
      yPos += 20;

      analysis.results.books.forEach((book, idx) => {
        checkSpace(35);

        // Book card
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'F');

        // Number badge
        doc.setFillColor(...colors.primary);
        doc.circle(30, yPos + 8, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}`, 30, yPos + 10, { align: 'center' });

        // Book info
        doc.setTextColor(...colors.text);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const bookTitle = doc.splitTextToSize(book.fullTitle, pageWidth - 90);
        doc.text(bookTitle, 40, yPos + 8);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.darkGray);
        doc.text(`${book.author}${book.year ? ` • ${book.year}` : ''} • ${book.timestamp}`, 40, yPos + 20);

        yPos += 35;
      });
    }

    // Papers Section
    if (analysis.results.papers.length > 0) {
      addNewPage();

      doc.setFillColor(...colors.secondary);
      doc.rect(20, yPos - 5, pageWidth - 40, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('🔬 Papers Académicos', 25, yPos + 3);
      yPos += 20;

      analysis.results.papers.forEach((paper, idx) => {
        checkSpace(35);

        doc.setFillColor(250, 250, 250);
        doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'F');

        doc.setFillColor(...colors.secondary);
        doc.circle(30, yPos + 8, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}`, 30, yPos + 10, { align: 'center' });

        doc.setTextColor(...colors.text);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const paperTitle = doc.splitTextToSize(paper.fullTitle, pageWidth - 90);
        doc.text(paperTitle, 40, yPos + 8);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.darkGray);
        doc.text(`${paper.authors.join(', ')} • ${paper.timestamp}`, 40, yPos + 20);

        yPos += 35;
      });
    }

    // Web Sources Section
    if (analysis.results.webSources.length > 0) {
      addNewPage();

      doc.setFillColor(...colors.accent);
      doc.rect(20, yPos - 5, pageWidth - 40, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('🌐 Fuentes Web', 25, yPos + 3);
      yPos += 20;

      analysis.results.webSources.forEach((source, idx) => {
        checkSpace(25);

        doc.setFillColor(250, 250, 250);
        doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, 'F');

        doc.setFillColor(...colors.accent);
        doc.circle(30, yPos + 8, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}`, 30, yPos + 10, { align: 'center' });

        doc.setTextColor(...colors.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(source.title, 40, yPos + 8);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.darkGray);
        doc.text(`${source.timestamp}`, 40, yPos + 15);

        yPos += 25;
      });
    }

    // Add page numbers
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(...colors.darkGray);
      doc.setFontSize(8);
      doc.text(`Página ${i - 1} de ${totalPages - 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Download
    const fileName = `analisis_${analysis.videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    doc.save(fileName);
  };

  return (
    <button
      onClick={handleExport}
      className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
    >
      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6"
        />
      </svg>
      <span>Descargar PDF</span>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"></div>
    </button>
  );
}
