import { useState } from "react";
import { Link } from "react-router";

export const SHELL_C = {
  bg: "#f6f6f8",
  sidebar: "#ffffff",
  surface: "#ffffff",
  border: "#e5e4ec",
  borderLight: "#eeedf3",
  text: "#17171c",
  textSub: "#3f3f46",
  muted: "#6b6b78",
  accent: "#4C6FFF",
  accentLt: "#eaf0ff",
  green: "#1f7a4d",
  greenLt: "#e7f4ec",
};

export function AccordionSection({ label, defaultOpen = false, children, icon }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${SHELL_C.borderLight}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left", border: "none", background: "none",
          padding: "12px 18px", display: "flex", justifyContent: "space-between",
          alignItems: "center", cursor: "pointer", gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && (
            <span style={{
              width: 26, height: 26, borderRadius: 7, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 13,
              background: open ? SHELL_C.accentLt : SHELL_C.bg,
              color: open ? SHELL_C.accent : SHELL_C.muted,
              transition: "background .15s, color .15s", flexShrink: 0,
            }}>
              {icon}
            </span>
          )}
          <span style={{
            fontSize: 12.5, fontWeight: 600,
            color: open ? SHELL_C.accent : SHELL_C.text,
            letterSpacing: "-.01em",
          }}>
            {label}
          </span>
        </div>
        <svg
          width="11" height="11" viewBox="0 0 11 11" fill="none"
          style={{ transition: "transform .2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        >
          <path d="M2 4L5.5 7.5L9 4" stroke={open ? SHELL_C.accent : SHELL_C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: "2px 18px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function InstallSection({ description, installUrl, note }) {
  return (
    <div style={{
      padding: "14px 18px", borderBottom: `1px solid ${SHELL_C.border}`,
      background: SHELL_C.accentLt,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.accent }}>Installation</span>
      </div>
      <p style={{ fontSize: 12, color: SHELL_C.muted, marginBottom: installUrl ? 10 : 0, lineHeight: 1.6 }}>
        {description}
      </p>
      {installUrl && (
        <a href={installUrl} target="_blank" rel="noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 12, fontWeight: 600, color: "#fff",
          background: SHELL_C.accent, borderRadius: 8, padding: "7px 14px", textDecoration: "none",
        }}>
          Install to Theme ↗
        </a>
      )}
      {note && (
        <div style={{
          marginTop: 10, background: "#fff", border: `1px solid ${SHELL_C.border}`,
          borderRadius: 8, padding: "9px 12px", fontSize: 11.5, color: SHELL_C.muted, lineHeight: 1.5,
        }}>
          {note}
        </div>
      )}
    </div>
  );
}

export function Field({ label, helpText, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: SHELL_C.text, marginBottom: 6 }}>{label}</div>
      {children}
      {helpText && (
        <div style={{ fontSize: 11, color: SHELL_C.muted, marginTop: 5, lineHeight: 1.5 }}>{helpText}</div>
      )}
    </div>
  );
}

export function ColorField({ label, value, onChange, helpText }) {
  return (
    <Field label={label} helpText={helpText}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, border: `2px solid ${SHELL_C.border}`,
          overflow: "hidden", flexShrink: 0, cursor: "pointer", position: "relative",
        }}>
          <input
            type="color" value={value} onChange={(e) => onChange(e.target.value)}
            style={{
              position: "absolute", inset: "-4px", width: "calc(100% + 8px)",
              height: "calc(100% + 8px)", border: "none", cursor: "pointer", padding: 0,
            }}
          />
        </div>
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
            padding: "7px 10px", fontSize: 12.5, fontFamily: "monospace",
            color: SHELL_C.text, background: "#fafbfc", outline: "none",
            letterSpacing: ".04em",
          }}
        />
      </div>
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, helpText }) {
  return (
    <Field label={label} helpText={helpText}>
      <div style={{ position: "relative" }}>
        <select
          value={value} onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
            padding: "8px 32px 8px 10px", fontSize: 12.5, background: "#fafbfc",
            color: SHELL_C.text, appearance: "none", outline: "none", cursor: "pointer",
          }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
        }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke={SHELL_C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  );
}

export function RangeField({ label, value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: SHELL_C.accent, cursor: "pointer" }}
        />
        <div style={{
          minWidth: 44, height: 28, borderRadius: 7, background: SHELL_C.accentLt,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11.5, fontWeight: 600, color: SHELL_C.accent, flexShrink: 0,
        }}>
          {value}{unit}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 10, color: SHELL_C.muted }}>{min}{unit}</span>
        <span style={{ fontSize: 10, color: SHELL_C.muted }}>{max}{unit}</span>
      </div>
    </Field>
  );
}

export function TextFieldInput({ label, value, onChange, placeholder, helpText }) {
  return (
    <Field label={label} helpText={helpText}>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
          padding: "8px 10px", fontSize: 12.5, boxSizing: "border-box",
          background: "#fafbfc", color: SHELL_C.text, outline: "none",
        }}
      />
    </Field>
  );
}

export function ToggleField({ label, checked, onChange, helpText }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
          background: checked ? SHELL_C.accent : "#d1d5db",
          position: "relative", transition: "background .2s", cursor: "pointer",
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 2, left: checked ? 18 : 2,
          transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.text, lineHeight: 1.3 }}>{label}</div>
        {helpText && <div style={{ fontSize: 11, color: SHELL_C.muted, marginTop: 3, lineHeight: 1.5 }}>{helpText}</div>}
      </div>
    </label>
  );
}

export default function WidgetCustomizeShell({
  title, backHref = "/app/widgets", installSection, sections, preview, onSave, saved,
}) {
  return (
    <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "'Inter','DM Sans','Segoe UI',sans-serif" }}>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 56, background: SHELL_C.surface,
        borderBottom: `1px solid ${SHELL_C.border}`,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to={backHref} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${SHELL_C.border}`,
            color: SHELL_C.text, textDecoration: "none", fontSize: 14, background: SHELL_C.bg,
          }}>←</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link to={backHref} style={{ fontSize: 13, color: SHELL_C.muted, textDecoration: "none" }}>
              Widgets
            </Link>
            <span style={{ fontSize: 13, color: SHELL_C.muted }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: SHELL_C.text }}>{title}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 12, fontWeight: 600, color: SHELL_C.green,
              background: SHELL_C.greenLt, padding: "4px 12px", borderRadius: 20,
            }}>
              ✓ Saved
            </span>
          )}
          <span style={{ fontSize: 11.5, color: SHELL_C.muted }}>Sample preview</span>
          <button onClick={onSave} style={{
            border: "none", borderRadius: 8, padding: "8px 20px",
            background: SHELL_C.accent, color: "#fff",
            fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>
            Save Changes
          </button>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>

        <div style={{
          width: 280, flexShrink: 0, background: SHELL_C.sidebar,
          borderRight: `1px solid ${SHELL_C.border}`, overflowY: "auto",
        }}>
          {installSection}
          {sections.map((s, i) => (
            <AccordionSection
              key={s.key}
              label={s.label}
              icon={s.icon}
              defaultOpen={i === 0 && !installSection}
            >
              {s.content}
            </AccordionSection>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{
            background: SHELL_C.surface, borderRadius: 16, border: `1px solid ${SHELL_C.border}`,
            padding: 28, maxWidth: 900, margin: "0 auto",
            boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
              paddingBottom: 16, borderBottom: `1px solid ${SHELL_C.border}`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: SHELL_C.accent }} />
              <span style={{
                fontSize: 11, fontWeight: 600, color: SHELL_C.muted,
                letterSpacing: ".08em", textTransform: "uppercase",
              }}>
                Live Preview — Sample Data
              </span>
            </div>
            {preview}
          </div>
        </div>
      </div>
    </div>
  );
}
