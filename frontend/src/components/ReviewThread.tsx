import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { ReportModal } from "./ReportModal";
import { fieldClass, ghostBtnClass, metaClass } from "../ui";

type Reply = {
  id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at?: string;
};

type Review = {
  id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at?: string;
  replies?: Reply[];
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export function ReviewThread({
  review,
  sessionId,
  isAdmin,
  onChanged,
}: {
  review: Review;
  sessionId?: number;
  isAdmin?: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [reportTarget, setReportTarget] = useState<{ id: number; type: "review" | "reply" } | null>(null);
  const replies = review.replies || [];

  function openReport(id: number, type: "review" | "reply") {
    setReportTarget({ id, type });
  }

  function closeReport() {
    setReportTarget(null);
  }

  function handleReportSuccess() {
    setStatus("Reporte enviado correctamente");
    setTimeout(() => setStatus(""), 3000);
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!sessionId) return;
    if (!draft.trim()) {
      setStatus("Escribe una respuesta");
      return;
    }
    try {
      await api.addReply(review.id, draft.trim());
      setDraft("");
      setStatus("");
      setOpen(true);
      await onChanged();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "No se pudo responder");
    }
  }

  async function saveEdit(replyId: number) {
    if (!editText.trim()) return;
    try {
      await api.updateReply(replyId, editText.trim());
      setEditingId(null);
      await onChanged();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "No se pudo editar");
    }
  }

  async function removeReply(replyId: number) {
    try {
      await api.deleteReply(replyId);
      await onChanged();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "No se pudo borrar");
    }
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="text-sm">{review.username}</strong>
          <span className={metaClass}>{formatDate(review.created_at)}</span>
        </div>
        {sessionId && sessionId !== review.user_id && (
          <button className={ghostBtnClass} type="button" onClick={() => openReport(review.id, "review")}>
            Reportar
          </button>
        )}
      </div>
      {replies.length > 0 && (
        <div className="mb-3 grid gap-2">
          {replies.map((reply) => {
            const mine = sessionId === reply.user_id || isAdmin;
            return (
              <div key={reply.id} className="rounded-md bg-bg/80 px-3 py-2">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{reply.username}</strong>
                  <span className={metaClass}>{formatDate(reply.created_at)}</span>
                </div>
                {editingId === reply.id ? (
                  <div className="grid gap-2">
                    <textarea className={fieldClass} rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} />
                    <div className="flex gap-2">
                      <button className={ghostBtnClass} type="button" onClick={() => saveEdit(reply.id)}>
                        Guardar
                      </button>
                      <button className={ghostBtnClass} type="button" onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="m-0 text-sm">{reply.comment}</p>
                )}
                {mine && editingId !== reply.id && (
                  <div className="mt-1 flex gap-1">
                    <button
                      className={ghostBtnClass}
                      type="button"
                      onClick={() => {
                        setEditingId(reply.id);
                        setEditText(reply.comment);
                      }}
                    >
                      Editar
                    </button>
                    <button className={ghostBtnClass} type="button" onClick={() => removeReply(reply.id)}>
                      Borrar
                    </button>
                  </div>
                )}
                {!mine && sessionId && (
                  <div className="mt-1 flex gap-1">
                    <button className={ghostBtnClass} type="button" onClick={() => openReport(reply.id, "reply")}>
                      Reportar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {sessionId ? (
        open ? (
          <form className="grid gap-2" onSubmit={sendReply}>
            <textarea
              className={fieldClass}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe una respuesta"
            />
            <div className="flex flex-wrap gap-2">
              <button className={ghostBtnClass} type="submit">
                Publicar respuesta
              </button>
              <button className={ghostBtnClass} type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button className={ghostBtnClass} type="button" onClick={() => setOpen(true)}>
            {replies.length ? `Responder · ${replies.length}` : "Responder"}
          </button>
        )
      ) : (
        <p className={metaClass}>
          <Link className="text-accent-text" to="/cuenta">
            Entra
          </Link>{" "}
          para responder en el hilo.
        </p>
      )}
      {status && <p className="mt-2 text-sm text-[#ff8a80]">{status}</p>}
      <ReportModal
        open={!!reportTarget}
        onClose={closeReport}
        targetId={reportTarget?.id ?? 0}
        targetType={reportTarget?.type ?? "review"}
        onSuccess={handleReportSuccess}
      />
    </div>
  );
}
