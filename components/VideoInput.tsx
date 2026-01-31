'use client';

import { useState } from 'react';
import { validateYouTubeUrl } from '@/lib/youtube';
import { AuthCredentials, AnalyzeRequest } from '@/lib/types';
import ModeSelector from './ModeSelector';

interface VideoInputProps {
  auth: AuthCredentials;
  onAnalysisComplete: (data: any) => void;
}

export default function VideoInput({ auth, onAnalysisComplete }: VideoInputProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'transcript' | 'video' | 'raw'>('transcript');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleAnalyze = async () => {
    if (!validateYouTubeUrl(videoUrl)) {
      setError('Por favor ingresa una URL válida de YouTube');
      return;
    }

    if (!auth.mode) {
      setError('Por favor configura tu autenticación primero');
      return;
    }

    setError('');
    setLoading(true);

    const modeLabels = {
      transcript: 'Analizando transcripción',
      video: 'Analizando video completo',
      raw: 'Extrayendo menciones básicas',
    };
    setProgress(`${modeLabels[analysisMode]}...`);

    try {
      const request: AnalyzeRequest = {
        videoUrl,
        analysisMode,
        mode: 'auto',
        resolution: 'low',
        completeReferences: analysisMode !== 'raw',
        userApiKey: auth.apiKey,
        accessPassword: auth.password,
      };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al analizar');
      }

      if (analysisMode !== 'raw') {
        setProgress('Completando referencias con IA...');
      }

      const data = await response.json();
      setProgress('');
      onAnalysisComplete(data);
    } catch (err: any) {
      setError(err.message);
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            URL del Video
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
            Pega el enlace de cualquier video público de YouTube
          </p>
          <div className="relative group">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={loading}
              className="w-full px-4 py-3.5 pl-12 rounded-xl border-2 border-gray-200 dark:border-gray-800
                bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 font-mono text-sm"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
        </label>
      </div>

      {/* Mode Selector */}
      <ModeSelector
        selectedMode={analysisMode}
        onChange={setAnalysisMode}
        disabled={loading}
      />

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={loading || !auth.mode || !videoUrl}
        className="group relative w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
          text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
          disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed
          transform hover:-translate-y-0.5 disabled:transform-none
          transition-all duration-200 overflow-hidden"
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

        <span className="relative flex items-center justify-center gap-2.5">
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analizando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Analizar Video
            </>
          )}
        </span>
      </button>

      {/* Progress */}
      {progress && (
        <div className="relative overflow-hidden rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {progress}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Por favor espera, esto puede tomar 1-2 minutos...
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">
                Error
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
