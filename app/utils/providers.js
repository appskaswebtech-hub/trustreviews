// app/utils/providers.js
// Client-safe metadata only — no fetch/secrets here. Server-only test
// functions live in integrations.server.js and must never be imported
// from a route component (only from a loader/action).
export const PROVIDER_META = {
  klaviyo: {
    logo: "/images/integrations/klaviyo.png",
    guide: {
      "steps": [
        "In Klaviyo go to Settings → API Keys → Create Private API Key.",
        "Choose Custom access and give it Full access to Events and Profiles (read access to Accounts is needed for Test Connection).",
        "Copy the key (starts with pk_), paste it above and click Save Settings.",
        "Click Test Connection. It should turn to Connected.",
        "In Klaviyo → Flows → Create Flow, pick 'Create from scratch' and use a Metric trigger: choose 'Review Submitted' or 'Review Approved'. The metrics appear after the first real event, so submit one test review first.",
        "Add your email or SMS steps (for example a thank-you email after Review Approved) and set the flow Live."
      ],
      "notes": [
        "Event properties you can use in templates: customer, rating, comment, productId, status."
      ]
    },
    label: "Klaviyo",
    description: "Send review events to Klaviyo as metrics. Use them to trigger email flows, SMS, and segments.",
    icon: "📨",
    bg: "linear-gradient(135deg,#e6e6ff,#c7c1ff)",
    keyLabel: "Private API Key",
    keyPlaceholder: "pk_xxxxxxxxxxxxxxxxxxxxxxxxxx",
    keyHelp: "Klaviyo → Settings → API Keys → Create Private API Key. Use a Private key (not Public).",
    requiresKey: true,
    requiresListId: false,
  },
  omnisend: {
    logo: "/images/integrations/omnisend.png",
    guide: {
      "steps": [
        "In Omnisend go to Store settings → Integrations & API → API keys → Create API key. Give it access to Contacts and Events.",
        "Copy the key, paste it above and click Save Settings, then Test Connection.",
        "In Omnisend go to Store settings → Custom events and create two events named exactly 'Review Submitted' and 'Review Approved'. Without them Omnisend rejects our events.",
        "Open Automations → Create workflow and choose a Custom event trigger: Review Submitted or Review Approved.",
        "Add email or SMS steps (for example a thank-you or a win-back after a low rating) and start the workflow."
      ],
      "notes": [
        "Each review event also creates the customer as a contact (not subscribed to marketing) so the workflow can reach them. Only message subscribed contacts where the law requires consent.",
        "Event properties available: customer, rating, comment, productId, status."
      ]
    },
    label: "Omnisend",
    description: "Send review events to Omnisend as custom events. Use them to trigger email and SMS automations, like a thank-you after a review or a win-back after a low rating.",
    icon: "📧",
    bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)",
    keyLabel: "API Key",
    keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx",
    keyHelp: "Omnisend → Store settings → Integrations & API → API keys → Create API key (give it Contacts and Events access). Then create custom events named 'Review Submitted' and 'Review Approved' under Store settings → Custom events.",
    requiresKey: true,
    requiresListId: false,
  },
  mailchimp: {
    guide: {
      "steps": [
        "In Mailchimp go to Account → Extras → API keys → Create A Key. Keep the datacenter suffix (for example -us6).",
        "Paste the key above, then choose your audience from the dropdown (or paste its Audience ID) and click Save Settings.",
        "Click Test Connection.",
        "In Mailchimp → Automations → Customer Journey, start with the trigger 'Tag added' and pick the tag we add, for example 'Review Submitted'.",
        "Add your email steps and turn the journey on."
      ],
      "notes": [
        "Reviewers are added to the chosen audience when they review."
      ]
    },
    logo: "/images/integrations/mailchimp.svg",
    label: "Mailchimp",
    description: "Subscribe reviewers to a Mailchimp audience and add tags. Trigger automations when a tag like 'Review Submitted' is added.",
    icon: "🐵",
    bg: "linear-gradient(135deg,#fff3d6,#ffe3a3)",
    keyLabel: "API Key",
    keyPlaceholder: "32characterkey-us6",
    keyHelp: "Mailchimp → Account → Extras → API keys. The key must include the datacenter suffix (e.g. -us6).",
    requiresKey: true,
    requiresListId: true,
    listIdLabel: "Audience (List) ID",
    listIdHelp: "Mailchimp → Audience → Manage Audience → Settings → Audience name and defaults → Audience ID.",
    listIdPlaceholder: "abc12345",
  },
  google_merchant: {
    guide: {
      "steps": [
        "Add the service account email shown above as a user in Merchant Center (Settings → Account access → Add user, Standard access).",
        "Copy your numeric Merchant Center ID (Settings → Business information), paste it above and click Save Settings.",
        "Click Test Connection, then 'Sync existing approved reviews now' to send your old approved reviews.",
        "New reviews are sent automatically when you approve them.",
        "In Merchant Center apply for the Product Ratings program (Growth → Manage programs). Google decides when stars appear on ads and listings."
      ],
      "notes": [
        "Your products need valid identifiers (GTIN or SKU) in the Merchant Center feed so reviews can be matched to them."
      ]
    },
    logo: "/images/integrations/google_merchant.svg",
    label: "Google Merchant Center",
    description: "Push approved product reviews straight to Google Merchant Center so star ratings can show up on Google Shopping ads and product listings (Product Ratings program).",
    icon: "🛒",
    bg: "linear-gradient(135deg,#e8f0fe,#c2d9fc)",
    keyLabel: "Merchant Center ID",
    keyPlaceholder: "123456789",
    keyHelp: "First add our service account as a user on your Merchant Center account (Settings → Account access → Add user — see the email above). Then paste your numeric Merchant Center ID here (Settings → Business information).",
    requiresKey: true,
    requiresListId: false,
  },
  azure_translator: {
    logo: "/images/integrations/azure_translator.png",
    guide: {
      "steps": [
        "In the Azure Portal choose Create a resource → Translator and deploy it (a free tier is available).",
        "Open the resource → Keys and Endpoint. Copy KEY 1 and the Location/Region.",
        "Paste the key and the region above, click Save Settings and then Test Connection.",
        "Reviews, store replies and Q&A are now translated for each shopper in their storefront language."
      ],
      "notes": [
        "Results are cached per language, so each text is billed once."
      ]
    },
    label: "Azure Translator",
    description: "Automatically machine-translate customer review text into each shopper's storefront language using Microsoft Azure Translator. The original review stays exactly as submitted — only what's displayed to that shopper is translated, and results are cached so you're not billed twice for the same text.",
    icon: "🌐",
    bg: "linear-gradient(135deg,#e0f2fe,#bae6fd)",
    keyLabel: "Translator API Key",
    keyPlaceholder: "32-character key",
    keyHelp: "Azure Portal → your Translator resource → Keys and Endpoint → copy KEY 1.",
    requiresKey: true,
    requiresListId: true,
    listIdLabel: "Resource Region",
    listIdPlaceholder: "centralindia",
    listIdHelp: "Azure Portal → your Translator resource → Keys and Endpoint → Location/Region (e.g. centralindia, eastus). Azure requires this alongside the key.",
    pricingUrl: "https://azure.microsoft.com/en-in/pricing/details/translator/",
  },
  hubspot: {
    guide: {
      "steps": [
        "In HubSpot go to Settings → Integrations → Private Apps → Create a private app.",
        "Under Scopes enable crm.objects.contacts.read, crm.objects.contacts.write and crm.schemas.contacts.write.",
        "Create the app, copy its access token, paste it above and click Save Settings, then Test Connection.",
        "After the first review event, contacts get the fields 'Trust Reviews: Last Rating', 'Last Review', 'Last Product ID' and 'Last Event'.",
        "Use those fields in HubSpot lists or workflows, for example 'Last Rating is less than 3' to start a follow-up."
      ],
      "notes": [
        "Only the most recent review is kept per contact. Without the schemas scope we still sync the contact and name, but not the rating and review text."
      ]
    },
    logo: "/images/integrations/hubspot.svg",
    label: "HubSpot",
    description: "Create or update a HubSpot contact whenever a customer submits or has a review approved, so you can segment reviewers and trigger HubSpot workflows.",
    icon: "🧲",
    bg: "linear-gradient(135deg,#ffedd5,#fed7aa)",
    keyLabel: "Private App Access Token",
    keyPlaceholder: "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    keyHelp: "HubSpot → Settings → Integrations → Private Apps → Create a private app with the crm.objects.contacts.read, crm.objects.contacts.write and crm.schemas.contacts.write scopes (the last one lets us create the rating/review fields on contacts), then copy its access token.",
    requiresKey: true,
    requiresListId: false,
  },
  webhook: {
    guide: {
      "steps": [
        "In Zapier create a Zap and choose the trigger 'Webhooks by Zapier' → 'Catch Hook'. Copy the Custom Webhook URL.",
        "Paste the URL above (it must start with https://), click Save Settings and then Test Connection. A sample event is sent.",
        "Back in Zapier click Test trigger so it picks up the sample, then add any action such as Google Sheets, Slack or Gmail.",
        "Publish the Zap. From now on every review event is sent to it automatically."
      ],
      "notes": [
        "Make, n8n or your own server work the same way: any https endpoint that accepts a JSON POST.",
        "Payload: { \"event\": \"Review Submitted\", \"email\": \"...\", \"properties\": { \"customer\", \"rating\", \"comment\", \"productId\", \"status\" }, \"sentAt\": \"...\" }"
      ]
    },
    logo: "/images/integrations/webhook.svg",
    label: "Zapier / Webhook",
    description: "POST every review event as JSON to any URL. Works with Zapier (Catch Hook), Make, n8n, or your own endpoint to connect thousands of other apps.",
    icon: "🔗",
    bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)",
    keyLabel: "Webhook URL",
    keyPlaceholder: "https://hooks.zapier.com/hooks/catch/123456/abcdef/",
    keyHelp: "In Zapier create a Zap with the 'Webhooks by Zapier → Catch Hook' trigger and paste the custom webhook URL here. Must start with https://.",
    requiresKey: true,
    requiresListId: false,
  },
  google_feed: {
    label: "Google Reviews Feed",
    description: "Generate a private XML feed of your approved reviews and add it to Google Merchant Center as a scheduled fetch. The simplest way to get star ratings on Google Shopping, with no API setup.",
    logo: "/images/integrations/google_merchant.svg",
    icon: "📄",
    bg: "linear-gradient(135deg,#e8f0fe,#c2d9fc)",
    requiresKey: false,
    requiresListId: false,
    guide: {
      "steps": [
        "Click 'Create feed link' above. We generate a private feed URL for your store.",
        "Copy the URL. Anyone with it can read your approved reviews, so don't share it publicly (you can regenerate it any time).",
        "In Google Merchant Center open Growth → Manage programs and turn on 'Product ratings'. (Google may take a few days to approve the program for your store.)",
        "Go to Data sources → Add product ratings source → Scheduled fetch, paste the feed URL and choose a daily fetch time. Click 'Fetch now' to test it.",
        "Check the data source's diagnostics in Merchant Center for any errors. Google then matches each review to your product using its SKU or barcode."
      ],
      "notes": [
        "Only approved reviews with text are included. Each product needs a SKU or a barcode (GTIN) that matches your Merchant Center product feed, and must be published on the Online Store.",
        "This needs no service account, so it works even if the Google Merchant Center (API) integration isn't set up."
      ]
    },
  },
  shopify_flow: {
    logo: "/images/integrations/shopify_flow.svg",
    label: "Shopify Flow",
    description: "Fire Shopify Flow triggers when reviews are submitted or approved. Build automations in Shopify admin — send emails via Shopify Email, Klaviyo, Mailchimp, or any Flow-compatible app. No API key needed.",
    icon: "⚡",
    bg: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
    requiresKey: false,
    requiresListId: false,
    triggers: [
      { handle: "review-submitted", label: "Review Submitted", description: "Fires when a customer submits a new review (pending or auto-approved)." },
      { handle: "review-approved",  label: "Review Approved",  description: "Fires when a review status is changed to 'approved'." },
    ],
  },
};
