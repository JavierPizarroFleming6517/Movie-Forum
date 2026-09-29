import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";
import type { ReportType, CreateReportPayload } from "../api/client";
import { useToast } from "../hooks/useToast";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetId: number;
  targetType: "review" | "reply";
  onSuccess?: () => void;
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "spam", label: "Spam / Publicidad" },
  { value: "offensive", label: "Ofensivo / Inapropiado" },
  { value: "spoiler", label: "Contiene spoilers sin avisar" },
  { value: "other", label: "Otro motivo" },
];

export function ReportModal({ open, onClose, targetId, targetType, onSuccess }: ReportModalProps) {
  if (!open) return null;

  const { showToast } = useToast();
  const [type, setType] = useState<ReportType>("offensive");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload: CreateReportPayload = { type, reason: reason.trim() };

    try {
      if (targetType === "review") {
        await api.reportReview(targetId, payload);
      } else {
        await api.reportReply(targetId, payload);
      }
      showToast("Reporte enviado correctamente", "success");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "No se pudo enviar el reporte");
      showToast(err.message || "Error al enviar reporte", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="report-modal-title" className="mb-4 text-lg font-semibold">Reportar {targetType === "review" ? "reseña" : "respuesta"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium">Motivo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReportType)}
              className="w-full rounded-lg border border-divider bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
              required
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium">Detalles (opcional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Describe brevemente el motivo del reporte..."
              className="w-full rounded-lg border border-divider bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
            <p className="mt-1 text-xs text-muted text-right">{reason.length}/500</p>
          </div>

          {error && <p className="mb-4 text-sm text-[#ff8a80]">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}