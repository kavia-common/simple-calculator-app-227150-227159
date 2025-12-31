import React from "react";

export default function NotFound() {
  return (
    <main className="min-h-screen px-4 py-10 flex items-center justify-center">
      <section
        className="w-full max-w-md rounded-2xl bg-white shadow-lg ring-1 ring-slate-200/70 p-6"
        role="alert"
        aria-live="assertive"
        aria-label="Page not found"
      >
        <h1 className="text-slate-900 text-2xl font-semibold tracking-tight">
          404 – Page Not Found
        </h1>
        <p className="text-slate-600 mt-2">
          The page you’re looking for doesn’t exist.
        </p>
      </section>
    </main>
  );
}
