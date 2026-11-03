const ensured = new Set();

// Fire-and-forget wrapper: installs once per shop per server process, retries
// on the next page load if it failed (e.g. scope not approved yet).
export function ensureWidgetScript(shop, admin) {
  if (ensured.has(shop)) return;
  installWidgetScript(admin)
    .then((r) => {
      if (r.success) ensured.add(shop);
      else console.error("[widget-script] install failed:", shop, r.message);
    })
    .catch((err) => console.error("[widget-script] install failed:", shop, err?.message));
}

// Installs the storefront widget script tag. Idempotent: does nothing when the
// tag is already there. Needs the read_script_tags / write_script_tags scopes.
export async function installWidgetScript(admin) {
  const APP_URL = process.env.SHOPIFY_APP_URL;
  if (!APP_URL) return { success: false, status: 500, message: "APP_URL not set in .env" };

  const WIDGET_SRC = `${APP_URL}/api/widget`;

  const listRes = await admin.graphql(`
    query {
      scriptTags(first: 50) {
        edges { node { id src } }
      }
    }
  `);
  const listData = await listRes.json();
  const tags = listData?.data?.scriptTags?.edges || [];

  if (tags.some(({ node }) => node.src.includes("api/widget"))) {
    return { success: true, message: "Already installed" };
  }

  const createRes = await admin.graphql(
    `#graphql
    mutation ($src: URL!) {
      scriptTagCreate(input: { src: $src }) {
        scriptTag { id src }
        userErrors { field message }
      }
    }`,
    { variables: { src: WIDGET_SRC } },
  );
  const createData = await createRes.json();
  const errors = createData?.data?.scriptTagCreate?.userErrors;
  if (errors?.length > 0) return { success: false, status: 500, message: errors[0].message };

  return { success: true, message: "Script installed successfully" };
}
