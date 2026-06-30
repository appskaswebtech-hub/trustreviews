// app/utils/providers.js
// Client-safe metadata only — no fetch/secrets here. Server-only test
// functions live in integrations.server.js and must never be imported
// from a route component (only from a loader/action).
export const PROVIDER_META = {
  klaviyo: {
    label: "Klaviyo",
    description: "Sync review and Q&A events to Klaviyo for email automations.",
    icon: "📨",
    bg: "linear-gradient(135deg,#e6e6ff,#c7c1ff)",
    keyPlaceholder: "pk_xxxxxxxxxxxxxxxxxxxxxxxxxx",
    keyHelp: "Klaviyo → Settings → API Keys → Create Private API Key.",
  },
  mailchimp: {
    label: "Mailchimp",
    description: "Sync review and Q&A events to a Mailchimp audience for email automations.",
    icon: "🐵",
    bg: "linear-gradient(135deg,#fff3d6,#ffe3a3)",
    keyPlaceholder: "32characterkey-us6",
    keyHelp: "Mailchimp → Account → Extras → API keys. Must include the -usX suffix.",
  },
};
