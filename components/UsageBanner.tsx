'use client';

interface UsageBannerProps {
  usage?: {
    hoursUsed: number;
    limit: number;
    hoursRemaining: number;
  };
}

export default function UsageBanner({ usage }: UsageBannerProps) {
  if (!usage) return null;

  const percentage = (usage.hoursUsed / usage.limit) * 100;
  const isWarning = usage.hoursRemaining < 2;

  return (
    <div
      className={`rounded-lg p-4 mb-6 ${
        isWarning
          ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">Uso compartido hoy</span>
        <span className="font-bold">
          {usage.hoursUsed}h / {usage.limit}h
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${
            isWarning ? 'bg-orange-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>

      <p className="text-sm">
        {isWarning ? (
          <>⚠️ Quedan {usage.hoursRemaining}h para hoy</>
        ) : (
          <>Quedan {usage.hoursRemaining}h para hoy</>
        )}
      </p>
    </div>
  );
}
