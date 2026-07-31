// app/routes/api.install-script.jsx
// Installs both the ratings inline widget AND the reviews slider widget as ScriptTags

import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const APP_URL = process.env.SHOPIFY_APP_URL;

    if (!APP_URL) {
      return Response.json(
        { success: false, message: "APP_URL not set in .env" },
        { status: 500 }
      );
    }

    const shopParam = encodeURIComponent(session.shop);

    // Scripts to install — shop is passed as a query param so each ScriptTag
    // response can resolve the merchant's per-shop settings/language.
    const scriptsToInstall = [
      { path: "/api/widget",         src: `${APP_URL}/api/widget?shop=${shopParam}`,         label: "Ratings inline widget" },
      { path: "/api/reviews-widget", src: `${APP_URL}/api/reviews-widget?shop=${shopParam}`,  label: "Reviews slider widget" },
    ];

    // Fetch existing ScriptTags
    const listRes = await admin.graphql(`
      query {
        scriptTags(first: 50) {
          edges { node { id src } }
        }
      }
    `);
    const listData = await listRes.json();
    const existingTags = (listData?.data?.scriptTags?.edges || []).map(({ node }) => node);

    const results = [];

    for (const script of scriptsToInstall) {
      const existing = existingTags.find((tag) => tag.src.split("?")[0] === `${APP_URL}${script.path}`);

      if (existing && existing.src === script.src) {
        results.push(`${script.label}: already installed`);
        continue;
      }

      if (existing) {
        // Old shop-less ScriptTag from before this fix — replace it instead of duplicating.
        await admin.graphql(`
          mutation {
            scriptTagDelete(id: "${existing.id}") { deletedScriptTagId }
          }
        `);
      }

      const createRes = await admin.graphql(`
        mutation {
          scriptTagCreate(input: { src: "${script.src}" }) {
            scriptTag { id src }
            userErrors { field message }
          }
        }
      `);

      const createData = await createRes.json();
      const errors = createData?.data?.scriptTagCreate?.userErrors;

      if (errors?.length > 0) {
        results.push(`${script.label}: ERROR - ${errors[0].message}`);
      } else {
        results.push(`${script.label}: installed ✓`);
      }
    }

    return Response.json({
      success: true,
      message: results.join(" | "),
    });
  } catch (err) {
    console.error("[install-script error]", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
