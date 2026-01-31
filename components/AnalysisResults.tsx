'use client';

import { useState } from 'react';
import { AnalysisResults, Book, Paper, WebSource, Author } from '@/lib/types';
import { getYouTubeUrlWithTimestamp } from '@/lib/youtube';

interface AnalysisResultsProps {
  results: AnalysisResults;
  videoUrl: string;
  videoTitle: string;
}

export default function AnalysisResultsComponent({ results, videoUrl, videoTitle }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<'books' | 'papers' | 'web' | 'authors'>('books');
  const [search, setSearch] = useState('');

  // Filter results based on search
  const filterBooks = results.books.filter(
    (book) =>
      book.fullTitle.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase()) ||
      book.rawMention.toLowerCase().includes(search.toLowerCase())
  );

  const filterPapers = results.papers.filter(
    (paper) =>
      paper.fullTitle.toLowerCase().includes(search.toLowerCase()) ||
      paper.authors.some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );

  const filterWebSources = results.webSources.filter(
    (source) =>
      source.title.toLowerCase().includes(search.toLowerCase()) ||
      source.rawMention.toLowerCase().includes(search.toLowerCase())
  );

  const filterAuthors = results.authors.filter((author) =>
    author.name.toLowerCase().includes(search.toLowerCase())
  );

  const confidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const labels = {
      high: 'Alta 🟢',
      medium: 'Media 🟡',
      low: 'Baja 🔴',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[confidence as keyof typeof colors]}`}>
        {labels[confidence as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">{videoTitle}</h2>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en resultados..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeTab === 'books'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Libros ({filterBooks.length})
        </button>
        <button
          onClick={() => setActiveTab('papers')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeTab === 'papers'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Papers ({filterPapers.length})
        </button>
        <button
          onClick={() => setActiveTab('web')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeTab === 'web'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Fuentes Web ({filterWebSources.length})
        </button>
        <button
          onClick={() => setActiveTab('authors')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeTab === 'authors'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Autores ({filterAuthors.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activeTab === 'books' &&
          (filterBooks.length > 0 ? (
            filterBooks.map((book, idx) => <BookCard key={idx} book={book} videoUrl={videoUrl} confidenceBadge={confidenceBadge} />)
          ) : (
            <EmptyState />
          ))}

        {activeTab === 'papers' &&
          (filterPapers.length > 0 ? (
            filterPapers.map((paper, idx) => <PaperCard key={idx} paper={paper} videoUrl={videoUrl} confidenceBadge={confidenceBadge} />)
          ) : (
            <EmptyState />
          ))}

        {activeTab === 'web' &&
          (filterWebSources.length > 0 ? (
            filterWebSources.map((source, idx) => <WebSourceCard key={idx} source={source} videoUrl={videoUrl} confidenceBadge={confidenceBadge} />)
          ) : (
            <EmptyState />
          ))}

        {activeTab === 'authors' &&
          (filterAuthors.length > 0 ? (
            filterAuthors.map((author, idx) => <AuthorCard key={idx} author={author} videoUrl={videoUrl} />)
          ) : (
            <EmptyState />
          ))}
      </div>
    </div>
  );
}

function BookCard({ book, videoUrl, confidenceBadge }: { book: Book; videoUrl: string; confidenceBadge: any }) {
  const timestampUrl = getYouTubeUrlWithTimestamp(videoUrl, book.timestamp);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-1">
            📚 {book.fullTitle}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            {book.author} {book.year && <span className="text-gray-500 dark:text-gray-400">({book.year})</span>}
          </p>
        </div>
        <div className="ml-3 flex-shrink-0">
          {confidenceBadge(book.confidence)}
        </div>
      </div>

      {book.rawMention !== book.fullTitle && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-3 italic">
          Mención original: &quot;{book.rawMention}&quot;
        </p>
      )}

      <div className="flex flex-wrap gap-3 items-center text-sm">
        <a
          href={timestampUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          ▶️ Ver en video ({book.timestamp})
        </a>

        {book.sources.length > 0 && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">Fuentes:</span>
            {book.sources.map((source, idx) => (
              <a
                key={idx}
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Link {idx + 1}
              </a>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function PaperCard({ paper, videoUrl, confidenceBadge }: { paper: Paper; videoUrl: string; confidenceBadge: any }) {
  const timestampUrl = getYouTubeUrlWithTimestamp(videoUrl, paper.timestamp);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-1">
            📄 {paper.fullTitle}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            {paper.authors.join(', ')} {paper.year && <span className="text-gray-500 dark:text-gray-400">({paper.year})</span>}
          </p>
          {paper.journal && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              📰 {paper.journal}
            </p>
          )}
        </div>
        <div className="ml-3 flex-shrink-0">
          {confidenceBadge(paper.confidence)}
        </div>
      </div>

      {paper.rawMention !== paper.fullTitle && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-3 italic">
          Mención original: &quot;{paper.rawMention}&quot;
        </p>
      )}

      <div className="flex flex-wrap gap-3 items-center text-sm">
        <a
          href={timestampUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          ▶️ Ver en video ({paper.timestamp})
        </a>

        {paper.sources.length > 0 && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">Fuentes:</span>
            {paper.sources.map((source, idx) => (
              <a
                key={idx}
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Link {idx + 1}
              </a>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function WebSourceCard({ source, videoUrl, confidenceBadge }: { source: WebSource; videoUrl: string; confidenceBadge: any }) {
  const timestampUrl = getYouTubeUrlWithTimestamp(videoUrl, source.timestamp);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-lg">{source.title}</h3>
        {confidenceBadge(source.confidence)}
      </div>

      {source.rawMention !== source.title && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
          Mención original: &quot;{source.rawMention}&quot;
        </p>
      )}

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline text-sm block mb-2 break-all"
        >
          🔗 {source.url}
        </a>
      )}

      <a
        href={timestampUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline text-sm"
      >
        Ver en video ({source.timestamp})
      </a>
    </div>
  );
}

function AuthorCard({ author, videoUrl }: { author: Author; videoUrl: string }) {
  const timestampUrl = getYouTubeUrlWithTimestamp(videoUrl, author.timestamp);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="font-bold text-lg mb-2">{author.name}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-2">{author.context}</p>
      <a
        href={timestampUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline text-sm"
      >
        Ver en video ({author.timestamp})
      </a>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      No se encontraron referencias
    </div>
  );
}
