import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Report, ReportStatus, ReportType, TargetType, ActionType, ReportsResponse, CreateModerationActionPayload } from "../../api/client";
import { ghostBtnClass, cn } from "../../ui";
import { useToast } from "../../hooks/useToast";

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pendiente",
  dismissed: "Descartado",
  action_taken: "Acción tomada",
};

const TYPE_LABELS: Record<ReportType, string> = {
  spam: "Spam",
  offensive: "Ofensivo",
  spoiler: "Spoiler",
  other: "Otro",
};

const TARGET_LABELS: Record<TargetType, string> = {
  review: "Reseña",
  reply: "Respuesta",
};

const ACTION_LABELS: Record<ActionType, string> = {
  warn: "Advertencia",
  delete_content: "Eliminar contenido",
  ban_temp: "Ban temporal",
  ban_perm: "Ban permanente",
};

export function ReportsPanel() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<{ status?: ReportStatus; type?: ReportType; search?: string }>({});
  const [actionModal, setActionModal] = useState<{ open: boolean; report: Report | null }>({ open: false, report: null });
  const [actionForm, setActionForm] = useState<CreateModerationActionPayload>({
    type: "warn",
    targetId: 0,
    targetType: "review",
    reason: "",
    durationDays: undefined,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [dismissConfirm, setDismissConfirm] = useState<number | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res: ReportsResponse = await api.getReports({
        status: filters.status,
        type: filters.type,
        page,
        limit,
      });
      setReports(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || "No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, filters.status, filters.type, filters.search]);

  useEffect(() => {
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleDismiss(report: Report) {
    if (dismissConfirm === report.id) {
      setDismissConfirm(null);
      try {
        await api.resolveReport(report.id, { status: "dismissed" });
        showToast("Reporte descartado", "success");
        fetchReports();
      } catch (err: any) {
        showToast(err.message || "No se pudo descartar", "error");
      }
    } else {
      setDismissConfirm(report.id);
      setTimeout(() => setDismissConfirm(null), 3000);
    }
  }

  async function handleActionTaken(report: Report) {
    setActionForm({
      type: "warn",
      targetId: report.targetId,
      targetType: report.targetType,
      reason: "",
      durationDays: undefined,
    });
    setActionModal({ open: true, report });
  }

  async function submitAction() {
    const { report } = actionModal;
    if (!report) return;
    setActionLoading(true);
    setActionError("");
    try {
      const moderationAction = await api.createModerationAction(actionForm);
      await api.resolveReport(report.id, { status: "action_taken", moderationActionId: moderationAction.id });
      setActionModal({ open: false, report: null });
      showToast("Acción aplicada correctamente", "success");
      fetchReports();
    } catch (err: any) {
      setActionError(err.message || "No se pudo crear la acción");
      showToast(err.message || "Error al aplicar acción", "error");
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("es", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (loading && reports.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Panel de Moderación</h2>
        <div className="flex items-center justify-center h-64 text-muted">Cargando reportes...</div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Panel de Moderación</h2>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.status || ""}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as ReportStatus || undefined })}
          className="rounded-lg border border-divider bg-surface px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="dismissed">Descartado</option>
          <option value="action_taken">Acción tomada</option>
        </select>
        <select
          value={filters.type || ""}
          onChange={(e) => setFilters({ ...filters, type: e.target.value as ReportType || undefined })}
          className="rounded-lg border border-divider bg-surface px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Todos los tipos</option>
          <option value="spam">Spam</option>
          <option value="offensive">Ofensivo</option>
          <option value="spoiler">Spoiler</option>
          <option value="other">Otro</option>
        </select>
        <input
          type="text"
          placeholder="Buscar por usuario..."
          value={filters.search || ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="rounded-lg border border-divider bg-surface px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent w-64"
        />
      </div>

      {error && <p className="mb-4 text-sm text-[#ff8a80]">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-divider">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-bg/80 border-b border-divider">
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Motivo</th>
              <th className="px-3 py-2 text-left">Reportador</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted">
                    <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-lg">No hay reportes</p>
                    <p className="text-sm">Los reportes de usuarios aparecerán aquí</p>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="border-b border-divider/50 hover:bg-white/5">
                  <td className="px-3 py-2 font-mono">{report.id}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        report.type === "spam" ? "bg-yellow-500/20 text-yellow-400" :
                        report.type === "offensive" ? "bg-red-500/20 text-red-400" :
                        report.type === "spoiler" ? "bg-purple-500/20 text-purple-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {TYPE_LABELS[report.type]}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate" title={report.reason}>{report.reason || "—"}</td>
                  <td className="px-3 py-2 font-mono">@{report.reporter.username}</td>
                  <td className="px-3 py-2">
                    {TARGET_LABELS[report.targetType]} #{report.targetId}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        report.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        report.status === "dismissed" ? "bg-gray-500/20 text-gray-400" :
                        "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {STATUS_LABELS[report.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(report.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {report.status === "pending" && (
                        <>
                          <button
                            className={`${ghostBtnClass} ${dismissConfirm === report.id ? "bg-red-500/20 text-red-400" : ""}`}
                            type="button"
                            onClick={() => handleDismiss(report)}
                            title="Descartar"
                          >
                            {dismissConfirm === report.id ? "¿Confirmar?" : "Descartar"}
                          </button>
                          <button
                            className={ghostBtnClass}
                            type="button"
                            onClick={() => handleActionTaken(report)}
                            title="Tomar acción"
                          >
                            Acción
                          </button>
                        </>
                      )}
                      {report.status === "action_taken" && report.moderationAction && (
                        <span className={cn("px-2 py-0.5 text-xs rounded", "bg-green-500/20 text-green-400")}>
                          {ACTION_LABELS[report.moderationAction.type]}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            Página {page} de {Math.ceil(total / limit)} — {total} total
          </p>
          <div className="flex gap-2">
            <button
              className={ghostBtnClass}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className={ghostBtnClass}
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {actionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setActionModal({ open: false, report: null })} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">Tomar acción moderadora</h3>
            <p className="mb-4 text-sm text-muted">
              Reporte #{actionModal.report?.id} · {TYPE_LABELS[actionModal.report?.type ?? "other"]} · {TARGET_LABELS[actionModal.report?.targetType ?? "review"]} #{actionModal.report?.targetId}
            </p>

            <form onSubmit={(e) => { e.preventDefault(); submitAction(); }}>
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium">Acción</label>
                <select
                  value={actionForm.type}
                  onChange={(e) => setActionForm({ ...actionForm, type: e.target.value as ActionType })}
                  className="w-full rounded-lg border border-divider bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="warn">Advertencia</option>
                  <option value="delete_content">Eliminar contenido</option>
                  <option value="ban_temp">Ban temporal</option>
                  <option value="ban_perm">Ban permanente</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium">Razón (opcional)</label>
                <textarea
                  value={actionForm.reason}
                  onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                  rows={3}
                  maxLength={500}
                  placeholder="Motivo de la acción..."
                  className="w-full rounded-lg border border-divider bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              {(actionForm.type === "ban_temp") && (
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-medium">Duración (días)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={actionForm.durationDays || ""}
                    onChange={(e) => setActionForm({ ...actionForm, durationDays: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-lg border border-divider bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>
              )}

              {actionError && <p className="mb-4 text-sm text-[#ff8a80]">{actionError}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className={ghostBtnClass}
                  onClick={() => setActionModal({ open: false, report: null })}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  disabled={actionLoading || (actionForm.type === "ban_temp" && !actionForm.durationDays)}
                >
                  {actionLoading ? "Aplicando..." : "Aplicar acción"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}