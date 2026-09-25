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
    // <div style={{ borderBottom: `1px solid ${SHELL_C.borderLight}` }} className="tr-app-components-widgetcustomizeshell-div-1">
    //   <button
    //     onClick={() => setOpen((v) => !v)}
    //     style={{
    //       width: "100%", textAlign: "left", border: "none", background: "none",
    //       padding: "12px 18px", display: "flex", justifyContent: "space-between",
    //       alignItems: "center", cursor: "pointer", gap: 8,
    //     }}
    //    className="tr-app-components-widgetcustomizeshell-button-2">
    //     <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="tr-app-components-widgetcustomizeshell-div-3">
    //       {icon && (
    //         <span style={{
    //           width: 26, height: 26, borderRadius: 7, display: "flex",
    //           alignItems: "center", justifyContent: "center", fontSize: 13,
    //           background: open ? SHELL_C.accentLt : SHELL_C.bg,
    //           color: open ? SHELL_C.accent : SHELL_C.muted,
    //           transition: "background .15s, color .15s", flexShrink: 0,
    //         }} className="tr-app-components-widgetcustomizeshell-span-4">
    //           {icon}
    //         </span>
    //       )}
    //       <span style={{
    //         fontSize: 12.5, fontWeight: 600,
    //         color: open ? SHELL_C.accent : SHELL_C.text,
    //         letterSpacing: "-.01em",
    //       }} className="tr-app-components-widgetcustomizeshell-span-5">
    //         {label}
    //       </span>
    //     </div>
    //     <svg
    //       width="11" height="11" viewBox="0 0 11 11" fill="none"
    //       style={{ transition: "transform .2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
    //      className="tr-app-components-widgetcustomizeshell-svg-6">
    //       <path d="M2 4L5.5 7.5L9 4" stroke={open ? SHELL_C.accent : SHELL_C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"  className="tr-app-components-widgetcustomizeshell-path-7"/>
    //     </svg>
    //   </button>
    //   {open && (
    //     <div style={{ padding: "2px 18px 18px", display: "flex", flexDirection: "column", gap: 16 }} className="tr-app-components-widgetcustomizeshell-div-8">
    //       {children}
    //     </div>
    //   )}
    // </div>
    <div
  className="tr-app-components-widgetcustomizeshell-div-1"
  style={{
    borderBottom: "1px solid #D6E6F2",
    background: open ? "#F9FCFE" : "#FFFFFF",
    transition: "background .18s ease",
  }}
>
  <button
    onClick={() => setOpen((v) => !v)}
    className="tr-app-components-widgetcustomizeshell-button-2"
    style={{
      width: "100%",
      textAlign: "left",
      border: "none",
      background: "transparent",
      padding: "13px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      cursor: "pointer",
      gap: 8,
    }}
  >
    <div
      className="tr-app-components-widgetcustomizeshell-div-3"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
      }}
    >
      {icon && (
        <span
          className="tr-app-components-widgetcustomizeshell-span-4"
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            background: open
              ? "linear-gradient(135deg,#8DB4D6,#D6E6F2)"
              : "#F2F7FB",
            color: open ? "#FFFFFF" : "#8DA7BC",
            border: open
              ? "1px solid #8DB4D6"
              : "1px solid #D6E6F2",
            boxShadow: open
              ? "0 5px 12px rgba(141,180,214,.18)"
              : "none",
            transition: "all .18s ease",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}

      <span
        className="tr-app-components-widgetcustomizeshell-span-5"
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: open ? "#4F7392" : "#5F7F9A",
          letterSpacing: "-.01em",
        }}
      >
        {label}
      </span>
    </div>

    <span
      style={{
        width: 24,
        height: 24,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: open ? "#F2F7FB" : "transparent",
        border: open ? "1px solid #D6E6F2" : "1px solid transparent",
        flexShrink: 0,
      }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 11 11"
        fill="none"
        className="tr-app-components-widgetcustomizeshell-svg-6"
        style={{
          transition: "transform .2s ease",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          flexShrink: 0,
        }}
      >
        <path
          d="M2 4L5.5 7.5L9 4"
          stroke={open ? "#4F7392" : "#8DA7BC"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tr-app-components-widgetcustomizeshell-path-7"
        />
      </svg>
    </span>
  </button>

  {open && (
    <div
      className="tr-app-components-widgetcustomizeshell-div-8"
      style={{
        padding: "3px 16px 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {children}
    </div>
  )}
</div>
  );
}

export function InstallSection({ description, installUrl, note, onInstall }) {
  return (
    // <div style={{
    //   padding: "14px 18px", borderBottom: `1px solid ${SHELL_C.border}`,
    //   background: SHELL_C.accentLt,
    // }} className="tr-app-components-widgetcustomizeshell-div-9">
    //   <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }} className="tr-app-components-widgetcustomizeshell-div-10">
    //     <span style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.accent }} className="tr-app-components-widgetcustomizeshell-span-11">Installation</span>
    //   </div>This badge appears wherever you add 
    //   <p style={{ fontSize: 12, color: SHELL_C.muted, marginBottom: installUrl ? 10 : 0, lineHeight: 1.6 }} className="tr-app-components-widgetcustomizeshell-p-12">
    //     {description}
    //   </p>
    //   {installUrl && (
    //     <a href={installUrl} target="_blank" rel="noreferrer" style={{
    //       display: "inline-flex", alignItems: "center", gap: 5,
    //       fontSize: 12, fontWeight: 600, color: "#fff",
    //       background: SHELL_C.accent, borderRadius: 8, padding: "7px 14px", textDecoration: "none",
    //     }} className="tr-app-components-widgetcustomizeshell-a-13">
    //       Install to Theme ↗
    //     </a>
    //   )}
    //   {note && (
    //     <div style={{
    //       marginTop: 10, background: "#fff", border: `1px solid ${SHELL_C.border}`,
    //       borderRadius: 8, padding: "9px 12px", fontSize: 11.5, color: SHELL_C.muted, lineHeight: 1.5,
    //     }} className="tr-app-components-widgetcustomizeshell-div-14">
    //       {note}
    //     </div>
    //   )}
    // </div>
    <div
  className="tr-app-components-widgetcustomizeshell-div-9"
  style={{
    padding: "18px 18px 16px",

    borderBottom: "1px solid #D6E6F2",

    background:
      "linear-gradient(135deg, #F2F7FB 0%, #FFFFFF 100%)",

    position: "relative",

    overflow: "hidden",
  }}
>
  {/* soft top accent */}
  <div
    className="tr-app-components-widgetcustomizeshell-div-9-accent"
    style={{
      position: "absolute",

      top: 0,
      left: 18,
      right: 18,

      height: 3,

      borderRadius: "0 0 10px 10px",

      background:
        "linear-gradient(90deg, transparent, #8DB4D6, transparent)",

      opacity: 0.75,
    }}
  />

  <div
    className="tr-app-components-widgetcustomizeshell-div-10"
    style={{
      display: "flex",

      alignItems: "center",

      gap: 9,

      marginBottom: 8,
    }}
  >
    <span
      className="tr-app-components-widgetcustomizeshell-install-icon"
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #8DB4D6 0%, #D6E6F2 100%)",
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: 700,
        boxShadow:
          "0 6px 14px rgba(141,180,214,.20)",
        flexShrink: 0,
      }}
    >
      ↗
    </span>

    <span
      className="tr-app-components-widgetcustomizeshell-span-11"
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#4F7392",
        letterSpacing: "-.01em",
      }}
    >
      Installation
    </span>
  </div>

  <p
    className="tr-app-components-widgetcustomizeshell-p-12"
    style={{
      fontSize: 14,
      color: "#829CAF",
      margin: `0 0 ${installUrl ? 12 : 0}px`,
      lineHeight: 1.65,
      paddingLeft: 0,
    }}
  >
    {description}
  </p>

  {installUrl && (
    <a
      href={installUrl}
      target="_blank"
      rel="noreferrer"
      onClick={onInstall}
      className="tr-app-components-widgetcustomizeshell-a-13"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginLeft: 39,
        minHeight: 36,
        fontSize: 12.5,
        fontWeight: 700,
        color: "#FFFFFF",
        background:
          "linear-gradient(135deg, #8DB4D6 0%, #6F96B6 100%)",
        borderRadius: 10,
        padding: "8px 14px",
        textDecoration: "none",
        boxShadow:
          "0 7px 18px rgba(79,115,146,.18)",
        transition:
          "transform .16s ease, box-shadow .16s ease",
      }}
    >
      Install to Theme ↗
    </a>
  )}

  {note && (
    <div
      className="tr-app-components-widgetcustomizeshell-div-14"
      style={{
        marginTop: 12,
        background: "#FFFFFF",
        border: "1px solid #D6E6F2",
        borderRadius: 11,
        padding: "11px 13px",
        fontSize: 14,
        color: "#6F8FA9",
        lineHeight: 1.55,
        boxShadow:
          "0 5px 14px rgba(141,180,214,.06)",
        position: "relative",
      }}
    >
      <span
        className="tr-app-components-widgetcustomizeshell-note-dot"
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#8DB4D6",
          marginRight: 7,
          verticalAlign: "middle",
        }}
      />

      {note}
    </div>
  )}
</div>
  );
}

export function Field({ label, helpText, children }) {
  return (
    <div className="tr-app-components-widgetcustomizeshell-div-15">
      <div style={{ fontSize: 14, fontWeight: 600, color: SHELL_C.text, marginBottom: 10 }} className="tr-app-components-widgetcustomizeshell-div-16">{label}</div>
      {children}
      {helpText && (
        <div style={{ fontSize: 12, color: SHELL_C.muted, marginTop: 10, lineHeight: 1.5, marginBottom: 10  }} className="tr-app-components-widgetcustomizeshell-div-17">{helpText}</div>
      )}
    </div>
  );
}

export function ColorField({ label, value, onChange, helpText }) {
  return (
    <Field label={label} helpText={helpText}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="tr-app-components-widgetcustomizeshell-div-18">
        <div style={{
          width: 36, height: 36, borderRadius: 8, border: `2px solid ${SHELL_C.border}`,
          overflow: "hidden", flexShrink: 0, cursor: "pointer", position: "relative",
        }} className="tr-app-components-widgetcustomizeshell-div-19">
          <input
            type="color" value={value} onChange={(e) => onChange(e.target.value)}
            style={{
              position: "absolute", inset: "-4px", width: "calc(100% + 8px)",
              height: "calc(100% + 8px)", border: "none", cursor: "pointer", padding: 0,
            }}
           className="tr-app-components-widgetcustomizeshell-input-20"/>
        </div>
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
            padding: "7px 10px", fontSize: 12.5, fontFamily: "monospace",
            color: SHELL_C.text, background: "#fafbfc", outline: "none",
            letterSpacing: ".04em",
          }}
         className="tr-app-components-widgetcustomizeshell-input-21"/>
      </div>
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, helpText }) {
  return (
    <Field label={label} helpText={helpText}>
      <div className="cust-dropdown" style={{ position: "relative" }}>
        <select
          value={value} onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
            padding: "8px 32px 8px 10px", fontSize: 12.5, background: "#fafbfc",
            color: SHELL_C.text, appearance: "none", outline: "none", cursor: "pointer",
          }}
         className="tr-app-components-widgetcustomizeshell-select-22">
          {options.map((o) => <option key={o.value} value={o.value} className="tr-app-components-widgetcustomizeshell-option-23">{o.label}</option>)}
        </select>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
        }} className="tr-app-components-widgetcustomizeshell-svg-24">
          <path d="M2 3.5L5 6.5L8 3.5" stroke={SHELL_C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"  className="tr-app-components-widgetcustomizeshell-path-25"/>
        </svg>
      </div>
    </Field>
  );
}

export function RangeField({ label, value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="tr-app-components-widgetcustomizeshell-div-26">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: SHELL_C.accent, cursor: "pointer" }}
         className="tr-app-components-widgetcustomizeshell-input-27"/>
        <div style={{
          minWidth: 44, height: 28, borderRadius: 7, background: SHELL_C.accentLt,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11.5, fontWeight: 600, color: SHELL_C.accent, flexShrink: 0,
        }} className="tr-app-components-widgetcustomizeshell-div-28">
          {value}{unit}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }} className="tr-app-components-widgetcustomizeshell-div-29">
        <span style={{ fontSize: 10, color: SHELL_C.muted }} className="tr-app-components-widgetcustomizeshell-span-30">{min}{unit}</span>
        <span style={{ fontSize: 10, color: SHELL_C.muted }} className="tr-app-components-widgetcustomizeshell-span-31">{max}{unit}</span>
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
       className="tr-app-components-widgetcustomizeshell-input-32"/>
    </Field>
  );
}

export function ToggleField({ label, checked, onChange, helpText }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }} className="tr-app-components-widgetcustomizeshell-label-33">
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
          background: checked ? SHELL_C.accent : "#d1d5db",
          position: "relative", transition: "background .2s", cursor: "pointer",
        }}
       className="tr-app-components-widgetcustomizeshell-div-34">
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 2, left: checked ? 18 : 2,
          transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }}  className="tr-app-components-widgetcustomizeshell-div-35"/>
      </div>
      <div className="tr-app-components-widgetcustomizeshell-div-36">
        <div style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.text, lineHeight: 1.3 }} className="tr-app-components-widgetcustomizeshell-div-37">{label}</div>
        {helpText && <div style={{ fontSize: 11, color: SHELL_C.muted, marginTop: 3, lineHeight: 1.5 }} className="tr-app-components-widgetcustomizeshell-div-38">{helpText}</div>}
      </div>
    </label>
  );
}

export default function WidgetCustomizeShell({
  title, backHref = "/app/widgets", installSection, sections, preview, onSave, saved,
}) {
  return (
    <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "var(--app-font-family)" }} className="tr-app-components-widgetcustomizeshell-div-39">

      {/* <div className="nab-bar" style={{
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
        <div  style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 12, fontWeight: 600, color: SHELL_C.green,
              background: SHELL_C.greenLt, padding: "4px 12px", borderRadius: 20,
            }}>
              ✓ Saved
            </span>
          )}
          <span className="simple-preview" style={{ fontSize: 11.5, color: SHELL_C.muted }}>Sample preview</span>
          <button onClick={onSave} style={{
            border: "none", borderRadius: 8, padding: "8px 20px",
            background: SHELL_C.accent, color: "#fff",
            fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>
            Save Changes
          </button>
        </div>
      </div> */}
      <div
  className="nab-bar"
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 62,
    padding: "0 24px",
    background:
      "linear-gradient(135deg, rgba(255,255,255,.98) 0%, rgba(242,247,251,.96) 100%)",
    borderBottom: "1px solid #D6E6F2",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow:
      "0 6px 20px rgba(79,115,146,.07)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  }}
>
  <style className="tr-app-components-widgetcustomizeshell-style-40">{`
    .nab-bar a,
    .nab-bar button {
      transition:
        transform .16s ease,
        border-color .16s ease,
        box-shadow .16s ease,
        background .16s ease,
        color .16s ease;
    }

    .nab-bar-back:hover {
      transform: translateX(-2px);
      border-color: #8DB4D6 !important;
      background: #FFFFFF !important;
      box-shadow: 0 6px 16px rgba(141,180,214,.14);
      color: #4F7392 !important;
    }

    .nab-bar-breadcrumb:hover {
      color: #4F7392 !important;
    }

    .nab-bar-save:hover {
      transform: translateY(-1px);
      box-shadow: 0 9px 20px rgba(79,115,146,.22) !important;
    }

    @media (max-width: 700px) {
      .nab-bar {
        padding: 10px 14px !important;
        min-height: auto !important;
        gap: 12px !important;
        flex-wrap: wrap !important;
      }

      .nab-bar-right {
        width: 100%;
        justify-content: space-between !important;
      }

      .simple-preview {
        display: none !important;
      }
    }
  `}</style>

  {/* Left side */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
    }}
   className="tr-app-components-widgetcustomizeshell-div-41">
    <Link
      to={backHref}
      className="nab-bar-back"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        width: 36,
        height: 36,

        borderRadius: 10,

        border: "1px solid #D6E6F2",

        color: "#5F7F9A",

        textDecoration: "none",

        fontSize: 16,

        fontWeight: 700,

        background: "#F2F7FB",

        boxShadow:
          "0 4px 12px rgba(141,180,214,.07)",

        flexShrink: 0,
      }}
    >
      ←
    </Link>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,

        minWidth: 0,

        padding: "5px 10px",

        background: "#FFFFFF",

        border: "1px solid #D6E6F2",

        borderRadius: 9,

        boxShadow:
          "0 3px 10px rgba(141,180,214,.05)",
      }}
     className="tr-app-components-widgetcustomizeshell-div-42">
      <Link
        to={backHref}
        className="nab-bar-breadcrumb"
        style={{
          fontSize: 16,

          color: "#829CAF",

          textDecoration: "none",

          fontWeight: 500,

          whiteSpace: "nowrap",
        }}
      >
        Widgets
      </Link>

      <span
        style={{
          fontSize: 16,

          color: "#B4C4D0",

          lineHeight: 1,
        }}
       className="tr-app-components-widgetcustomizeshell-span-43">
        /
      </span>

      <span
        style={{
          fontSize: 16,

          fontWeight: 700,

          color: "#4F7392",

          whiteSpace: "nowrap",

          overflow: "hidden",

          textOverflow: "ellipsis",

          maxWidth: 260,
        }}
       className="tr-app-components-widgetcustomizeshell-span-44">
        {title}
      </span>
    </div>
  </div>

  {/* Right side */}
  <div
    className="nab-bar-right"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}
  >
    {saved && (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          fontWeight: 700,
          color: "#4F7392",
          background: "#D6E6F2",
          padding: "6px 11px",
          borderRadius: 20,
          border:
            "1px solid rgba(141,180,214,.45)",

          whiteSpace: "nowrap",
        }}
       className="tr-app-components-widgetcustomizeshell-span-45">
        <span
          style={{
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "#8DB4D6",
            color: "#FFFFFF",
            fontSize: 9,
          }}
         className="tr-app-components-widgetcustomizeshell-span-46">
          ✓
        </span>

        Saved
      </span>
    )}

    <span
      className="simple-preview"
      style={{
        fontSize: 16,
        color: "#8BA2B4",
        background: "#F2F7FB",
        border: "1px solid #D6E6F2",
        padding: "6px 10px",
        borderRadius: 8,
        whiteSpace: "nowrap",
      }}
    >
      Sample preview
    </span>

    <button
      onClick={onSave}
      className="nab-bar-save"
      style={{
        border: "none",
        borderRadius: 10,
        height: 38,
        padding: "0 20px",
        background:
          "linear-gradient(135deg, #8DB4D6 0%, #6F96B6 100%)",
        color: "#FFFFFF",
        fontWeight: 700,
        fontSize: 16,
        cursor: "pointer",
        boxShadow:
          "0 7px 18px rgba(79,115,146,.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
      }}
    >
      Save Changes
    </button>
  </div>
</div>

      {/* <div className="widget-customize-shell-contentss" style={{ display: "flex", height: "calc(100vh - 56px)" }}>

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
      </div> */}
      <div
  className="widget-customize-shell-contentss"
  style={{
    display: "flex",
    height: "calc(100vh - 62px)",
    minHeight: 620,
    background: "#EEF5FA",
    fontFamily: "var(--app-font-family)",
    "--tr-star-color": "#F5B301",
  }}
>
  <style className="tr-customizer-global-styles">{`
    .widget-customize-shell-contentss * {
      box-sizing: border-box;
    }

    .tr-customizer-sidebar,
    .tr-customizer-preview-area {
      scrollbar-width: thin;
      scrollbar-color: #C9DDEA transparent;
    }

    .tr-customizer-sidebar::-webkit-scrollbar,
    .tr-customizer-preview-area::-webkit-scrollbar {
      width: 7px;
    }

    .tr-customizer-sidebar::-webkit-scrollbar-track,
    .tr-customizer-preview-area::-webkit-scrollbar-track {
      background: transparent;
    }

    .tr-customizer-sidebar::-webkit-scrollbar-thumb,
    .tr-customizer-preview-area::-webkit-scrollbar-thumb {
      background: #C9DDEA;
      border-radius: 30px;
    }

    .tr-customizer-sidebar {
      font-size: 14.5px;
    }

    .tr-customizer-sidebar button,
    .tr-customizer-sidebar input,
    .tr-customizer-sidebar select,
    .tr-customizer-sidebar textarea {
      font-family: inherit;
      font-size: 14px;
    }

    .tr-customizer-sidebar input,
    .tr-customizer-sidebar select,
    .tr-customizer-sidebar textarea {
      border-radius: 10px !important;
      border-color: #D6E6F2 !important;
      transition:
        border-color .16s ease,
        box-shadow .16s ease,
        background .16s ease;
    }

    .tr-customizer-sidebar input:focus,
    .tr-customizer-sidebar select:focus,
    .tr-customizer-sidebar textarea:focus {
      outline: none !important;
      border-color: #8DB4D6 !important;
      background: #FFFFFF !important;
      box-shadow: 0 0 0 3px rgba(141,180,214,.14) !important;
    }

    .tr-customizer-preview-frame {
      transition:
        border-color .18s ease,
        box-shadow .18s ease,
        transform .18s ease;
    }

    .tr-customizer-preview-frame:hover {
      border-color: #B8D2E6 !important;
      box-shadow:
        0 28px 72px rgba(79,115,146,.14),
        0 10px 24px rgba(141,180,214,.07) !important;
    }

    .tr-customizer-preview-canvas {
      transition:
        border-color .18s ease,
        box-shadow .18s ease;
    }

    .tr-customizer-preview-canvas:hover {
      border-color: #C7DBE9 !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.95),
        0 8px 24px rgba(79,115,146,.05);
    }

    .tr-customizer-live-dot {
      animation: trCustomizerLivePulse 1.8s ease-in-out infinite;
    }

    @keyframes trCustomizerLivePulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(141,180,214,.30);
      }

      50% {
        box-shadow: 0 0 0 7px rgba(141,180,214,0);
      }
    }

    .widget-customize-shell-contentss .tr-star,
    .widget-customize-shell-contentss .tr-stars,
    .widget-customize-shell-contentss .review-star,
    .widget-customize-shell-contentss .rating-star,
    .widget-customize-shell-contentss .star-rating,
    .widget-customize-shell-contentss .rating-stars,
    .widget-customize-shell-contentss .star-rating svg,
    .widget-customize-shell-contentss .rating-stars svg,
    .widget-customize-shell-contentss [data-star="true"] {
      color: #F5B301 !important;
      fill: #F5B301 !important;
    }

    @media (max-width: 980px) {
      .widget-customize-shell-contentss {
        flex-direction: column !important;
        height: auto !important;
      }

      .tr-customizer-sidebar {
        width: 100% !important;
        max-height: 390px;
        border-right: none !important;
        border-bottom: 1px solid #D6E6F2 !important;
      }

      .tr-customizer-preview-area {
        padding: 24px !important;
      }
    }

    @media (max-width: 640px) {
      .tr-customizer-preview-area {
        padding: 14px !important;
      }

      .tr-customizer-preview-frame {
        border-radius: 20px !important;
      }

      .tr-customizer-preview-header {
        padding: 18px !important;
        flex-wrap: wrap !important;
      }

      .tr-customizer-preview-body {
        padding: 20px !important;
      }

      .tr-customizer-preview-canvas {
        padding: 20px !important;
      }

      .tr-customizer-preview-badge {
        display: none !important;
      }
    }
  `}</style>

  {/* ================= LEFT SIDEBAR ================= */}
  <div
    className="tr-customizer-sidebar"
    style={{
      width: 340,
      flexShrink: 0,

      background:
        "linear-gradient(180deg, #FFFFFF 0%, #FAFCFD 58%, #F4F9FC 100%)",
      borderRight: "1px solid #D6E6F2",
      overflowY: "auto",
      position: "relative",
      zIndex: 3,
      boxShadow:
        "12px 0 34px rgba(79,115,146,.045)",
    }}
  >
    <div
      className="tr-customizer-sidebar-accent"
      style={{
        height: 4,
        position: "sticky",
        top: 0,
        zIndex: 6,
        background:
          "linear-gradient(90deg, #8DB4D6 0%, #AFCBE2 50%, #D6E6F2 100%)",
        boxShadow:
          "0 3px 10px rgba(141,180,214,.12)",
      }}
    />

    <div
      className="tr-customizer-sidebar-inner"
      style={{
        padding: "20px 17px 30px",
      }}
    >
      <div className="tr-customizer-install-section">
        {installSection}
      </div>

      <div className="tr-customizer-accordion-list">
        {sections.map((s, i) => (
          <div
            key={s.key}
            className={`tr-customizer-accordion-item tr-customizer-accordion-item-${s.key}`}
          >
            <AccordionSection
              label={s.label}
              icon={s.icon}
              defaultOpen={i === 0 && !installSection}
            >
              <div className="tr-customizer-accordion-content">
                {s.content}
              </div>
            </AccordionSection>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* ================= RIGHT PREVIEW AREA ================= */}
  <div
    className="tr-customizer-preview-area"
    style={{
      flex: 1,

      overflowY: "auto",

      padding: "38px 44px 50px",

      position: "relative",

      background: `
        radial-gradient(
          760px circle at 100% -8%,
          rgba(214,230,242,.76),
          transparent 58%
        ),
        radial-gradient(
          560px circle at -5% 108%,
          rgba(141,180,214,.15),
          transparent 62%
        ),
        linear-gradient(
          180deg,
          #EEF5FA 0%,
          #F8FBFD 100%
        )
      `,
    }}
  >
    {/* subtle grid */}
    <div
      className="tr-customizer-workspace-grid"
      style={{
        position: "absolute",
        inset: 0,

        pointerEvents: "none",

        opacity: 0.22,

        backgroundImage: `
          linear-gradient(
            rgba(141,180,214,.11) 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            rgba(141,180,214,.11) 1px,
            transparent 1px
          )
        `,

        backgroundSize: "30px 30px",

        maskImage:
          "linear-gradient(to bottom, rgba(0,0,0,.45), transparent 75%)",
      }}
    />

    {/* decorative glow */}
    <div
      className="tr-customizer-workspace-glow"
      style={{
        position: "absolute",

        width: 320,
        height: 320,

        top: -150,
        right: -100,

        borderRadius: "50%",

        background:
          "rgba(214,230,242,.38)",

        filter: "blur(34px)",

        pointerEvents: "none",
      }}
    />

    {/* ================= PREVIEW FRAME ================= */}
    <div
      className="tr-customizer-preview-frame"
      style={{
        maxWidth: 1040,

        margin: "0 auto",

        background: "#FFFFFF",

        border: "1px solid #D6E6F2",

        borderRadius: 28,

        overflow: "hidden",

        boxShadow: `
          0 24px 64px rgba(79,115,146,.11),
          0 8px 22px rgba(141,180,214,.06)
        `,

        position: "relative",

        zIndex: 2,
      }}
    >
      {/* top accent */}
      <div
        className="tr-customizer-preview-top-accent"
        style={{
          width: "100%",
          height: 4,

          background:
            "linear-gradient(90deg, #8DB4D6 0%, #AFCBE2 52%, #D6E6F2 100%)",
        }}
      />

      {/* ================= PREVIEW HEADER ================= */}
      <div
        className="tr-customizer-preview-header"
        style={{
          display: "flex",

          alignItems: "center",

          justifyContent: "space-between",

          gap: 18,

          padding: "23px 28px",

          background:
            "linear-gradient(180deg, #FFFFFF 0%, #FBFDFE 100%)",

          borderBottom: "1px solid #E1ECF4",
        }}
      >
        <div
          className="tr-customizer-preview-header-left"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            className="tr-customizer-preview-icon"
            style={{
              width: 46,
              height: 46,

              flexShrink: 0,

              borderRadius: 14,

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              background:
                "linear-gradient(135deg, #8DB4D6 0%, #C3DAEB 100%)",

              border:
                "1px solid rgba(255,255,255,.92)",

              boxShadow:
                "0 8px 20px rgba(141,180,214,.24)",
            }}
          >
            <span
              className="tr-customizer-live-dot"
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#FFFFFF",
                border:
                  "2px solid rgba(79,115,146,.12)",
              }}
            />
          </div>

          <div className="tr-customizer-preview-heading-group">
            <div
              className="tr-customizer-preview-title-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
              }}
            >
              <span
                className="tr-customizer-preview-title"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#4F7392",
                  letterSpacing: ".015em",
                }}
              >
                Live Preview
              </span>

              <span
                className="tr-customizer-preview-title-dot"
                style={{
                  width: 4,
                  height: 4,

                  borderRadius: "50%",

                  background: "#C3D3DF",
                }}
              />

              <span
                className="tr-customizer-preview-sample-text"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#8BA2B4",
                }}
              >
                Sample Data
              </span>
            </div>

            <div
              className="tr-customizer-preview-description"
              style={{
                fontSize: 14,
                color: "#9AAEBC",
                lineHeight: 1.45,
              }}
            >
              Changes update here while you customize your widget
            </div>
          </div>
        </div>

        <div
          className="tr-customizer-preview-badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 13px",
            borderRadius: 999,
            background:
              "linear-gradient(135deg, #F2F7FB, #FFFFFF)",
            border: "1px solid #D6E6F2",
            color: "#6F8FA9",
            fontSize: 12,
            fontWeight: 700,
            boxShadow:
              "0 4px 12px rgba(141,180,214,.07)",
          }}
        >
          <span
            className="tr-customizer-preview-badge-dot"
            style={{
              width: 7,
              height: 7,

              borderRadius: "50%",

              background: "#8DB4D6",

              boxShadow:
                "0 0 0 3px rgba(141,180,214,.12)",
            }}
          />

          <span className="tr-customizer-preview-badge-text">
            Preview
          </span>
        </div>
      </div>

      {/* ================= PREVIEW BODY ================= */}
      <div
        className="tr-customizer-preview-body"
        style={{
          padding: "38px 36px 42px",

          minHeight: 540,

          background: `
            radial-gradient(
              440px circle at 100% 0%,
              rgba(242,247,251,.95),
              transparent 70%
            ),
            linear-gradient(
              180deg,
              #FFFFFF 0%,
              #FBFDFE 100%
            )
          `,

          position: "relative",
        }}
      >
        <div
          className="tr-customizer-preview-body-glow"
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            bottom: -100,
            left: -90,
            borderRadius: "50%",
            background:
              "rgba(141,180,214,.08)",
            filter: "blur(25px)",
            pointerEvents: "none",
          }}
        />

        {/* actual preview canvas */}
        <div
          className="tr-customizer-preview-canvas"
          style={{
            minHeight: 440,
            padding: "34px",
            position: "relative",
            zIndex: 1,
            background: "#FFFFFF",
            border:
              "1px solid rgba(214,230,242,.92)",
            borderRadius: 22,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.95)",
            color: "#4F7392",
            fontSize: 15.5,
            lineHeight: 1.65,
          }}
        >
          <div
            className="tr-customizer-preview-render"
            style={{
              width: "100%",
            }}
          >
            {preview}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
    </div>
  );
}
