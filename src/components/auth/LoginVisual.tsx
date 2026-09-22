"use client";

import { useRef, useState } from "react";
import { CalendarDays, FileText, TrendingUp, ShieldCheck } from "lucide-react";
import { Logo, ToothIcon } from "@/components/brand/Logo";

// Painel visual do login. Usa a foto da clínica fornecida, com uma
// camada de overlay nas cores da marca para manter o texto branco
// legível por cima — mesmo princípio da referência original.
const FEATURES = [
  { icon: CalendarDays, label: "Agendamento\ninteligente" },
  { icon: FileText, label: "Prontuário\ndigital" },
  { icon: ToothIcon, label: "Odontograma\ncompleto" },
  { icon: TrendingUp, label: "Financeiro\nsimplificado" },
];

export function LoginVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOffset({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      className="relative w-full h-full overflow-hidden bg-ink"
    >
      {/* Foto de fundo + overlay nas cores da marca */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out"
        style={{
          backgroundImage: "url(/login-clinic.png)",
          transform: `scale(1.05) translate(${offset.x * -8}px, ${offset.y * -8}px)`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-ink/75 via-ink/55 to-primary-dark/60" />
      {/* Reforço de escurecimento só na base, onde o texto fica mais denso */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />

      {/* Círculos decorativos — canto superior e inferior esquerdo */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full border border-white/10 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${offset.x * 10}px, ${offset.y * 10}px)` }}
      />
      <div
        className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full border border-primary-light/20 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${offset.x * 16}px, ${offset.y * 16}px)` }}
      />
      <div
        className="absolute w-[420px] h-[420px] rounded-full bg-primary-light/15 blur-[110px] transition-transform duration-500 ease-out"
        style={{
          left: `calc(20% + ${offset.x * 18}px)`,
          top: `calc(30% + ${offset.y * 18}px)`,
        }}
      />

      {/* Conteúdo */}
      <div className="relative h-full flex flex-col justify-between p-10 lg:p-12 text-white">
        <div className="animate-fade-in-up">
          <Logo size={56} light />
        </div>

        <div className="animate-fade-in-up [animation-delay:100ms]">
          <div className="w-8 h-px bg-primary-light mb-5" />
          <h1 className="font-display text-4xl leading-[1.15]" style={{ fontWeight: 700 }}>
            Mais eficiência
            <br />
            para o seu
            <br />
            <span className="text-primary-light">consultório.</span>
          </h1>
          <p className="text-white/55 text-sm mt-5 max-w-sm leading-relaxed">
            Agenda, prontuário, odontograma e financeiro da sua clínica em um
            único lugar.
          </p>

          <div className="grid grid-cols-4 gap-3 mt-9 max-w-md">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.label} className="flex flex-col items-start gap-2">
                  <div className="w-10 h-10 rounded-lg border border-white/20 flex items-center justify-center">
                    <Icon size={18} className="text-primary-light" strokeWidth={1.75} />
                  </div>
                  <p className="text-[11px] text-white/60 leading-tight whitespace-pre-line">
                    {feature.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2.5 animate-fade-in-up [animation-delay:180ms]">
          <ShieldCheck size={18} className="text-primary-light shrink-0" strokeWidth={1.75} />
          <div>
            <p className="text-sm text-white/85 leading-tight">Seus dados protegidos</p>
            <p className="text-xs text-white/45 leading-tight">
              Segurança e confiabilidade para sua clínica.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
