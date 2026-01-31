'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import VideoInput from '@/components/VideoInput';
import AuthSelector from '@/components/AuthSelector';
import AnalysisResults from '@/components/AnalysisResults';
import PDFExport from '@/components/PDFExport';
import { AuthCredentials, AnalyzeResponse, Analysis } from '@/lib/types';
import { saveAnalysis, getAuthCredentials } from '@/lib/storage';

export default function Home() {
  const [auth, setAuth] = useState<AuthCredentials>({ mode: null });
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);

  // Load auth from localStorage only on client (avoid hydration mismatch)
  useEffect(() => {
    setAuth(getAuthCredentials());
  }, []);

  const handleAuthChange = (newAuth: AuthCredentials) => {
    setAuth(newAuth);
  };

  const handleAnalysisComplete = (data: AnalyzeResponse) => {
    setAnalysisData(data);

    // Save to history
    const analysis: Analysis = {
      id: Date.now().toString(),
      videoId: data.videoId,
      videoUrl: '',
      videoTitle: data.videoTitle,
      channel: data.channel,
      duration: data.duration,
      analyzedAt: new Date().toISOString(),
      authMethod: auth.mode === 'apikey' ? 'user' : auth.mode === 'password' ? 'friends' : 'owner',
      results: data.results,
    };

    saveAnalysis(analysis);
    setCurrentAnalysis(analysis);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-6">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              Powered by Gemini 3 Flash AI
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
              Descubre Referencias
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              en Cualquier Video
            </span>
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Extrae automáticamente libros, papers y fuentes mencionadas en videos de YouTube
            usando inteligencia artificial avanzada
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Auth */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <AuthSelector onAuthChange={handleAuthChange} />

              {/* Stats */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border border-gray-200 dark:border-gray-800">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Características
                </h3>
                <div className="space-y-2.5">
                  {[
                    { icon: '⚡', text: 'Análisis en segundos' },
                    { icon: '📚', text: 'Extrae libros y papers' },
                    { icon: '🎯', text: '95% más económico' },
                    { icon: '🔍', text: 'Verificación con IA' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Video Input Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/50 dark:shadow-none p-6 sm:p-8">
              <VideoInput auth={auth} onAnalysisComplete={handleAnalysisComplete} />
            </div>

            {/* Results */}
            {analysisData && currentAnalysis && (
              <div className="space-y-6">
                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Resultados del Análisis
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {analysisData.videoTitle}
                    </p>
                  </div>
                  <PDFExport analysis={currentAnalysis} />
                </div>

                {/* Results Content */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden">
                  <AnalysisResults
                    results={analysisData.results}
                    videoUrl={`https://www.youtube.com/watch?v=${analysisData.videoId}`}
                    videoTitle={analysisData.videoTitle}
                  />
                </div>
              </div>
            )}

            {/* Empty State */}
            {!analysisData && (
              <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Sin resultados aún
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ingresa una URL de YouTube arriba para comenzar el análisis
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Hecho con ❤️ usando Gemini 3 Flash AI
          </p>
        </div>
      </footer>
    </div>
  );
}
