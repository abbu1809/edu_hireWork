import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "./Modal";

/**
 * App-wide replacement for window.confirm / window.prompt.
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title, message, confirmLabel, tone: "danger" });
 *   const res = await confirm({ title, input: { label, required: true } }); // → { value } | false
 *
 * Resolves to `true` (or `{ value }` when an input is requested) on confirm,
 * and `false` on cancel / Escape / backdrop click.
 */
const ConfirmContext = createContext(null);

function ConfirmModal({ options, onResolve }) {
  const { title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "default", input } = options;
  const [value, setValue] = useState(input?.defaultValue || "");
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const confirmRef = useRef(null);
  const fieldRef = useRef(null);

  // Focus the text field when there is one, otherwise the confirm button.
  useEffect(() => {
    (input ? fieldRef.current : confirmRef.current)?.focus();
  }, [input]);

  const trimmed = value.trim();
  const invalid = Boolean(input?.required) && trimmed.length < (input?.minLength || 1);
  const danger = tone === "danger";
  const Icon = danger ? AlertTriangle : HelpCircle;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    onResolve(input ? { value: trimmed } : true);
  };

  return (
    <Modal title={title} onClose={() => onResolve(false)} maxWidth="460px">
      <form onSubmit={submit}>
        <div style={{ display: "flex", gap: "0.9rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <span
            className="icon-circle"
            style={danger ? { background: "var(--color-error-bg)", color: "var(--color-error)" } : undefined}
            aria-hidden="true"
          >
            <Icon size={22} />
          </span>
          {message && <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, paddingTop: "0.6rem" }}>{message}</p>}
        </div>

        {input && (
          <div className="form-group">
            <label className="form-label" htmlFor={fieldId}>
              {input.label}
              {input.required ? "" : " (optional)"}
            </label>
            <textarea
              id={fieldId}
              ref={fieldRef}
              className="input-field"
              rows={input.rows || 3}
              maxLength={input.maxLength || 500}
              placeholder={input.placeholder}
              value={value}
              aria-invalid={touched && invalid}
              onChange={(e) => setValue(e.target.value)}
            />
            {touched && invalid && (
              <span style={{ color: "var(--color-error)", fontSize: "0.8rem" }} role="alert">
                {input.requiredMessage || "This field is required."}
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-dark-outline" style={{ flex: "1 1 140px" }} onClick={() => onResolve(false)}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} type="submit" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} style={{ flex: "1 1 140px" }}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null); // { options, resolve }

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setRequest((current) => {
          current?.resolve(false); // a new request cancels any open one
          return { options: typeof options === "string" ? { title: options } : options, resolve };
        });
      }),
    []
  );

  const handleResolve = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmModal key={request.options.title} options={request.options} onResolve={handleResolve} />}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
};
