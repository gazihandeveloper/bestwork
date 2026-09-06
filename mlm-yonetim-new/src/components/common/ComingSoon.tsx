import React from "react";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-2xl">
        🚧
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Bu sayfa hazırlanıyor. Yakında kullanıma sunulacaktır.
      </p>
    </div>
  );
}
