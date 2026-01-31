'use client';

import { useState, useEffect } from 'react';
import { getAuthCredentials, saveAuthCredentials, clearAuthCredentials } from '@/lib/storage';
import { AuthCredentials } from '@/lib/types';

interface AuthSelectorProps {
  onAuthChange: (creds: AuthCredentials) => void;
}

export default function AuthSelector({ onAuthChange }: AuthSelectorProps) {
  const [mode, setMode] = useState<'apikey' | 'password'>('apikey');
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const creds = getAuthCredentials();
    if (creds.mode) {
      setMode(creds.mode);
      if (creds.apiKey) setApiKey(creds.apiKey);
      if (creds.password) setPassword(creds.password);
      setSaved(true);
      onAuthChange(creds);
    }
  }, []);

  const handleSave = () => {
    const creds: AuthCredentials = {
      mode,
      apiKey: mode === 'apikey' ? apiKey : undefined,
      password: mode === 'password' ? password : undefined,
    };

    saveAuthCredentials(creds);
    onAuthChange(creds);
    setSaved(true);
  };

  const handleClear = () => {
    clearAuthCredentials();
    setApiKey('');
    setPassword('');
    setSaved(false);
    onAuthChange({ mode: null });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Autenticación</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('apikey')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'apikey'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Mi API Key
        </button>
        <button
          onClick={() => setMode('password')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'password'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Usar Contraseña
        </button>
      </div>

      {/* Content */}
      {mode === 'apikey' ? (
        <div>
          <label className="block text-sm font-medium mb-2">
            API Key de Gemini
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Tu API key personal"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Obtén tu API key gratis en{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2">
            Contraseña compartida
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña del grupo"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Límite: 8 horas de video por día (compartido entre todos)
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={mode === 'apikey' ? !apiKey : !password}
          className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Guardar
        </button>
        {saved && (
          <button
            onClick={handleClear}
            className="py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {saved && (
        <div className="mt-3 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
          Credenciales guardadas localmente
        </div>
      )}
    </div>
  );
}
