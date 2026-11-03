import AlertBanner from "./AlertBanner";

// Outcome of a form action: green banner on success, red on failure.
export default function ResultBanner({ ok, message, failedTitle = "Something went wrong", okTitle = "Done", style }) {
  if (!message) return null;
  return (
    <AlertBanner tone={ok ? "success" : "critical"} title={ok ? okTitle : failedTitle} style={{ marginTop: 14, ...style }}>
      {message}
    </AlertBanner>
  );
}
