import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);
    const APP_URL = process.env.SHOPIFY_APP_URL;

    if (!APP_URL) {
      return Response.json(
        { success: false, message: "APP_URL not set in .env" },
        { status: 500 }
      );
    }

    const WIDGET_SRC = `${APP_URL}/api/widget`;

    // ── Existing Script Tags check karo ──
    const listRes = await admin.graphql(`
      query {
        scriptTags(first: 50) {
          edges {
            node {
              id
              src
            }
          }
        }
      }
    `);

    const listData = await listRes.json();
    const tags = listData?.data?.scriptTags?.edges || [];

    const alreadyInstalled = tags.some(({ node }) =>
      node.src.includes("api/widget")
    );

    if (alreadyInstalled) {
      return Response.json({ success: true, message: "Already installed" });
    }

    // ── Naya Script Tag create karo ──
    const createRes = await admin.graphql(`
      mutation {
        scriptTagCreate(input: {
          src: "${WIDGET_SRC}"
        }) {
          scriptTag {
            id
            src
          }
          userErrors {
            field
            message
          }
        }
      }
    `);

    const createData = await createRes.json();
    const errors = createData?.data?.scriptTagCreate?.userErrors;

    if (errors?.length > 0) {
      return Response.json(
        { success: false, message: errors[0].message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, message: "Script installed successfully" });

  } catch (err) {
    console.error("[install-script error]", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}