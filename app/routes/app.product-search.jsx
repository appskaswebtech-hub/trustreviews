import { authenticate } from "../shopify.server";

// Small search endpoint backing the admin's "Assign / Change Product" picker
// (called from a useFetcher, not a full page navigation).
export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() || "";

  if (!query) {
    return { products: [] };
  }

  try {
    const response = await admin.graphql(
      `query($query: String!) {
        products(first: 8, query: $query) {
          edges { node { id title featuredImage { url } } }
        }
      }`,
      { variables: { query: `title:*${query}*` } },
    );
    const data = await response.json();
    const products = (data?.data?.products?.edges || []).map(({ node }) => ({
      id: node.id.replace(/^gid:\/\/shopify\/Product\//, ""),
      title: node.title,
      image: node.featuredImage?.url || null,
    }));
    return { products };
  } catch (err) {
    console.error("[product-search error]", err);
    return { products: [] };
  }
}
