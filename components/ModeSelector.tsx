'use client';

interface ModeSelectorProps {
  selectedMode: 'transcript' | 'video' | 'raw';
  onChange: (mode: 'transcript' | 'video' | 'raw') => void;
  disabled?: boolean;
  disablePremium?: boolean; // Disable Premium mode for friends
}

export default function ModeSelector({ selectedMode, onChange, disabled, disablePremium = false }: ModeSelectorProps) {
  const modes = [
    {
      id: 'transcript' as const,
      name: 'Económico',
      description: 'Análisis de transcripción',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: 'Recomendado',
      cost: '~$0.01-0.04',
      speed: 'Ultra rápido',
      color: 'from-green-500 to-emerald-600',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      badgeColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    },
    {
      id: 'video' as const,
      name: 'Premium',
      description: 'Análisis de video completo',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      badge: 'Contenido visual',
      cost: '~$0.28-0.68',
      speed: 'Completo',
      color: 'from-blue-500 to-purple-600',
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      badgeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    },
    {
      id: 'raw' as const,
      name: 'Rápido',
      description: 'Solo menciones básicas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      badge: 'Sin verificación',
      cost: '~$0.01',
      speed: 'Instantáneo',
      color: 'from-orange-500 to-red-600',
      borderColor: 'border-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      badgeColor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Modo de Análisis
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Elige cómo quieres analizar el video
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const isPremiumDisabled = disablePremium && mode.id === 'video';
          const isDisabled = disabled || isPremiumDisabled;

          return (
            <button
              key={mode.id}
              onClick={() => !isDisabled && onChange(mode.id)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${isSelected
                  ? `${mode.borderColor} ${mode.bgColor} shadow-lg`
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
              `}
            >
              {/* Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${mode.badgeColor}`}>
                  {isPremiumDisabled ? '🔒 Solo con API key' : mode.badge}
                </span>
                {isSelected && !isPremiumDisabled && (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Icon & Title */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${mode.color} text-white`}>
                  {mode.icon}
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {mode.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {mode.description}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Costo</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{mode.cost}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Velocidad</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{mode.speed}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
