"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <div className="print:hidden sticky top-0 bg-surface/90 backdrop-blur-sm border-b border-border px-6 py-3 flex justify-center">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
      >
        <Printer size={15} />
        Imprimir / Salvar como PDF
      </button>
    </div>
  );
}
