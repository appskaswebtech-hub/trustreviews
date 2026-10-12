// Reads the store's live (MAIN) theme and reports which of this app's theme
// blocks and app embeds are actually in it — so the Widgets page's "Installed"
// badge disappears when a merchant removes a block in the Theme Editor.
// Needs the read_themes scope; returns null when the theme can't be read, and
// callers then fall back to the "Add to store" clicks saved in WidgetInstall.

const THEME_FILES_QUERY = `#graphql
  query TrustReviewsThemeFiles($after: String) {
    currentAppInstallation { app { handle } }
    themes(first: 1, roles: [MAIN]) {
      nodes {
        files(
          first: 50
          after: $after
          filenames: ["templates/*.json", "sections/*.json", "config/settings_data.json"]
        ) {
          nodes {
            filename
            body { ... on OnlineStoreThemeFileBodyText { content } }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
`;

const MAX_PAGES = 10;

// App block types look like "shopify://apps/<app-slug>/blocks/<block-handle>/<extension-uuid>".
const APP_BLOCK_TYPE = /^shopify:\/\/apps\/([^/]+)\/blocks\/([^/]+)\/([^/]+)$/;

// Block handles other apps commonly use too — not enough on their own to say
// a set of blocks is ours.
const GENERIC_HANDLES = new Set(["app-embed", "review", "form"]);

// JSON templates start with a /* … */ header Shopify writes; JSON.parse can't read it.
function parseThemeJson(content) {
  try {
    return JSON.parse(content.replace(/^\s*\/\*[\s\S]*?\*\//, ""));
  } catch {
    return null;
  }
}

// Collects every enabled app block (any app) in a parsed theme file.
function collectAppBlocks(node, found) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectAppBlocks(n, found));
    return;
  }
  const match = typeof node.type === "string" && APP_BLOCK_TYPE.exec(node.type);
  if (match && node.disabled !== true) {
    found.push({ slug: match[1], handle: match[2], uuid: match[3], settings: node.settings || {} });
  }
  Object.values(node).forEach((v) => collectAppBlocks(v, found));
}

// settings_data.json: app embeds live under "current" (an object, or the name of a preset).
function currentThemeSettings(data) {
  if (!data) return null;
  return typeof data.current === "string" ? data.presets?.[data.current] : data.current;
}

// The slug in a block type isn't always the app's handle (e.g. handle
// "trust-reviews-5", blocks saved as "shopify://apps/trust-reviews/…"), so find
// our theme extension by its UUID: the one whose slug equals the handle, or
// else the one with the most of our own (non-generic) block handles.
function ourExtensionUuid(blocks, appHandle, knownHandles) {
  const exact = blocks.find((b) => b.slug === appHandle);
  if (exact) return exact.uuid;

  const score = new Map();
  for (const b of blocks) {
    if (knownHandles.has(b.handle) && !GENERIC_HANDLES.has(b.handle)) {
      score.set(b.uuid, (score.get(b.uuid) || 0) + 1);
    }
  }
  let best = null;
  for (const [uuid, n] of score) if (!best || n > score.get(best)) best = uuid;
  return best;
}

/**
 * @param admin  the Admin API client from authenticate.admin
 * @param knownHandles  this app's theme block / app embed handles
 * @returns {Promise<Array<{handle: string, settings: object}> | null>}
 *   this app's enabled blocks/embeds in the live theme, or null if unreadable.
 */
export async function getThemeAppBlocks(admin, knownHandles) {
  try {
    const blocks = [];
    let appHandle = null;
    let after = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await admin.graphql(THEME_FILES_QUERY, { variables: { after } });
      const json = await res.json();
      if (json.errors?.length) {
        console.warn("[themeInstalls] GraphQL errors:", JSON.stringify(json.errors));
        return null;
      }

      appHandle = json.data?.currentAppInstallation?.app?.handle;
      const theme = json.data?.themes?.nodes?.[0];
      if (!theme) return null;

      for (const file of theme.files.nodes) {
        const data = parseThemeJson(file.body?.content || "");
        const root = file.filename === "config/settings_data.json" ? currentThemeSettings(data) : data;
        collectAppBlocks(root, blocks);
      }

      if (!theme.files.pageInfo.hasNextPage) break;
      after = theme.files.pageInfo.endCursor;
    }

    const uuid = ourExtensionUuid(blocks, appHandle, new Set(knownHandles));
    return blocks
      .filter((b) => b.uuid === uuid)
      .map(({ handle, settings }) => ({ handle, settings }));
  } catch (err) {
    console.warn("[themeInstalls] could not read the live theme:", err?.message || err, JSON.stringify(err?.body?.errors || err?.response?.errors || ""));
    return null;
  }
}
