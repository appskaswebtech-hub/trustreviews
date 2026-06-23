import { useState } from "react";
import { Link } from "react-router";

export const SHELL_C = {
  border: "#e4e7ef", text: "#0f1623", muted: "#6b7280",
  accent: "#008060", accentLt: "#e3f1ee", surface: "#fff", bg: "#f6f6f7",
};

export function AccordionSection({ label, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${SHELL_C.border}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left", border: "none", background: "transparent",
          padding: "14px 18px", display: "flex", justifyContent: "space-between",
          alignItems: "center", cursor: "pointer", fontSize: 13, fontWeight: 700,
          color: SHELL_C.text,
        }}
      >
        {label}
        <span style={{
          fontSize: 10, color: SHELL_C.muted,
          transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s",
        }}>▶</span>
      </button>
      {open && <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>}
    </div>
  );
}

export function InstallSection({ description, installUrl, note }) {
  return (
    <div style={{ padding: "16px 18px", borderBottom: `1px solid ${SHELL_C.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: SHELL_C.accent, marginBottom: 6 }}>Install</div>
      <p style={{ fontSize: 12.5, color: SHELL_C.muted, marginBottom: 10, lineHeight: 1.5 }}>{description}</p>
      {installUrl && (
        <a
          href={installUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block", fontSize: 12, fontWeight: 700, color: "#fff",
            background: SHELL_C.accent, borderRadius: 8, padding: "7px 14px", textDecoration: "none",
          }}
        >
          Install ↗
        </a>
      )}
      {note && (
        <div style={{
          marginTop: 12, background: SHELL_C.bg, border: `1px solid ${SHELL_C.border}`,
          borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: SHELL_C.muted, lineHeight: 1.5,
        }}>{note}</div>
      )}
    </div>
  );
}

export function Field({ label, helpText, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: SHELL_C.text, marginBottom: 5 }}>{label}</div>
      {children}
      {helpText && <div style={{ fontSize: 11, color: SHELL_C.muted, marginTop: 4 }}>{helpText}</div>}
    </div>
  );
}

export function ColorField({ label, value, onChange, helpText }) {
  return (
    <Field label={label} helpText={helpText}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: 32, height: 32, border: `1px solid ${SHELL_C.border}`, borderRadius: 6, padding: 0, cursor: "pointer" }}
        />
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, border: `1px solid ${SHELL_C.border}`, borderRadius: 6, padding: "6px 9px", fontSize: 12.5 }}
        />
      </div>
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, helpText }) {
  return (
    <Field label={label} helpText={helpText}>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", border: `1px solid ${SHELL_C.border}`, borderRadius: 6, padding: "7px 9px", fontSize: 12.5, background: "#fff" }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function RangeField({ label, value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <Field label={`${label}: ${value}${unit}`}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
    </Field>
  );
}

export function TextFieldInput({ label, value, onChange, placeholder, helpText }) {
  return (
    <Field label={label} helpText={helpText}>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: `1px solid ${SHELL_C.border}`, borderRadius: 6, padding: "7px 9px", fontSize: 12.5, boxSizing: "border-box" }}
      />
    </Field>
  );
}

export function ToggleField({ label, checked, onChange, helpText }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 2 }} />
      <span>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.text }}>{label}</div>
        {helpText && <div style={{ fontSize: 11, color: SHELL_C.muted, marginTop: 2 }}>{helpText}</div>}
      </span>
    </label>
  );
}

export default function WidgetCustomizeShell({
  title, backHref = "/app/widgets", installSection, sections, preview, onSave, saved,
}) {
  return (
    <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 22px", background: SHELL_C.surface, borderBottom: `1px solid ${SHELL_C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to={backHref} style={{ fontSize: 16, color: SHELL_C.text, textDecoration: "none" }}>←</Link>
          <span style={{ fontWeight: 700, fontSize: 15, color: SHELL_C.text }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {saved && <span style={{ fontSize: 12, color: SHELL_C.accent, fontWeight: 600 }}>✓ Saved</span>}
          <span style={{ fontSize: 11.5, color: SHELL_C.muted, fontWeight: 600 }}>👁 Previewing · Sample data</span>
          <button
            onClick={onSave}
            style={{
              border: "none", borderRadius: 8, padding: "8px 18px", background: SHELL_C.accent,
              color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>

      <div style={{ display: "flex" }}>
        <div style={{ width: 300, flexShrink: 0, background: SHELL_C.surface, borderRight: `1px solid ${SHELL_C.border}`, minHeight: "calc(100vh - 57px)" }}>
          {installSection}
          {sections.map((s, i) => (
            <AccordionSection key={s.key} label={s.label} defaultOpen={i === 0 && !installSection}>
              {s.content}
            </AccordionSection>
          ))}
        </div>
        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
          <div style={{
            background: SHELL_C.surface, borderRadius: 14, border: `1px solid ${SHELL_C.border}`,
            padding: 28, maxWidth: 920, margin: "0 auto",
          }}>
            {preview}
          </div>
        </div>
      </div>
    </div>
  );
}
