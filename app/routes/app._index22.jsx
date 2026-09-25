import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
            demoInfo: metafield(namespace: "$app", key: "demo_info") {
              jsonValue
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
          metafields: [
            {
              namespace: "$app",
              key: "demo_info",
              value: "Created by React Router Template",
            },
          ],
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();
  const metaobjectResponse = await admin.graphql(
    `#graphql
    mutation shopifyReactRouterTemplateUpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject {
          id
          handle
          title: field(key: "title") {
            jsonValue
          }
          description: field(key: "description") {
            jsonValue
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        handle: {
          type: "$app:example",
          handle: "demo-entry",
        },
        metaobject: {
          fields: [
            { key: "title", value: "Demo Entry" },
            {
              key: "description",
              value:
                "This metaobject was created by the Shopify app template to demonstrate the metaobject API.",
            },
          ],
        },
      },
    },
  );
  const metaobjectResponseJson = await metaobjectResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
    metaobject: metaobjectResponseJson.data.metaobjectUpsert.metaobject,
  };
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.product?.id) {
      shopify.toast.show("Product created");
    }
  }, [fetcher.data?.product?.id, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <s-page heading="Shopify app template" className="tr-app-routes-app-index22-s-page-1">
      <s-button slot="primary-action" onClick={generateProduct} className="tr-app-routes-app-index22-s-button-2">
        Generate a product
      </s-button>

      <s-section heading="Congrats on creating a new Shopify app 🎉" className="tr-app-routes-app-index22-s-section-3">
        <s-paragraph className="tr-app-routes-app-index22-s-paragraph-4">
          This embedded app template uses{" "}
          <s-link
            href="https://shopify.dev/docs/apps/tools/app-bridge"
            target="_blank"
           className="tr-app-routes-app-index22-s-link-5">
            App Bridge
          </s-link>{" "}
          interface examples like an{" "}
          <s-link href="/app/additional" className="tr-app-routes-app-index22-s-link-6">additional page in the app nav</s-link>
          , as well as an{" "}
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
           className="tr-app-routes-app-index22-s-link-7">
            Admin GraphQL
          </s-link>{" "}
          mutation demo, to provide a starting point for app development.
        </s-paragraph>
      </s-section>
      <s-section heading="Get started with products" className="tr-app-routes-app-index22-s-section-8">
        <s-paragraph className="tr-app-routes-app-index22-s-paragraph-9">
          Generate a product with GraphQL and get the JSON output for that
          product. Learn more about the{" "}
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
            target="_blank"
           className="tr-app-routes-app-index22-s-link-10">
            productCreate
          </s-link>{" "}
          mutation in our API references. Includes a product{" "}
          <s-link
            href="https://shopify.dev/docs/apps/build/custom-data/metafields"
            target="_blank"
           className="tr-app-routes-app-index22-s-link-11">
            metafield
          </s-link>{" "}
          and{" "}
          <s-link
            href="https://shopify.dev/docs/apps/build/custom-data/metaobjects"
            target="_blank"
           className="tr-app-routes-app-index22-s-link-12">
            metaobject
          </s-link>
          .
        </s-paragraph>
        <s-stack direction="inline" gap="base" className="tr-app-routes-app-index22-s-stack-13">
          <s-button
            onClick={generateProduct}
            {...(isLoading ? { loading: true } : {})}
           className="tr-app-routes-app-index22-s-button-14">
            Generate a product
          </s-button>
          {fetcher.data?.product && (
            <s-button
              onClick={() => {
                shopify.intents.invoke?.("edit:shopify/Product", {
                  value: fetcher.data?.product?.id,
                });
              }}
              target="_blank"
              variant="tertiary"
             className="tr-app-routes-app-index22-s-button-15">
              Edit product
            </s-button>
          )}
        </s-stack>
        {fetcher.data?.product && (
          <s-section heading="productCreate mutation" className="tr-app-routes-app-index22-s-section-16">
            <s-stack direction="block" gap="base" className="tr-app-routes-app-index22-s-stack-17">
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
               className="tr-app-routes-app-index22-s-box-18">
                <pre style={{ margin: 0 }} className="tr-app-routes-app-index22-pre-19">
                  <code className="tr-app-routes-app-index22-code-20">{JSON.stringify(fetcher.data.product, null, 2)}</code>
                </pre>
              </s-box>

              <s-heading className="tr-app-routes-app-index22-s-heading-21">productVariantsBulkUpdate mutation</s-heading>
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
               className="tr-app-routes-app-index22-s-box-22">
                <pre style={{ margin: 0 }} className="tr-app-routes-app-index22-pre-23">
                  <code className="tr-app-routes-app-index22-code-24">{JSON.stringify(fetcher.data.variant, null, 2)}</code>
                </pre>
              </s-box>

              <s-heading className="tr-app-routes-app-index22-s-heading-25">metaobjectUpsert mutation</s-heading>
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
               className="tr-app-routes-app-index22-s-box-26">
                <pre style={{ margin: 0 }} className="tr-app-routes-app-index22-pre-27">
                  <code className="tr-app-routes-app-index22-code-28">
                    {JSON.stringify(fetcher.data.metaobject, null, 2)}
                  </code>
                </pre>
              </s-box>
            </s-stack>
          </s-section>
        )}
      </s-section>

      <s-section slot="aside" heading="App template specs" className="tr-app-routes-app-index22-s-section-29">
        <s-paragraph className="tr-app-routes-app-index22-s-paragraph-30">
          <s-text className="tr-app-routes-app-index22-s-text-31">Framework: </s-text>
          <s-link href="https://reactrouter.com/" target="_blank" className="tr-app-routes-app-index22-s-link-32">
            React Router
          </s-link>
        </s-paragraph>
        <s-paragraph className="tr-app-routes-app-index22-s-paragraph-33">
          <s-text className="tr-app-routes-app-index22-s-text-34">Interface: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/app-home/using-polaris-components"
            target="_blank"
           className="tr-app-routes-app-index22-s-link-35">
            Polaris web components
          </s-link>
        </s-paragraph>
        <s-paragraph className="tr-app-routes-app-index22-s-paragraph-36">
          <s-text className="tr-app-routes-app-index22-s-text-37">API: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
           className="tr-app-routes-app-index22-s-link-38">
            GraphQL
          </s-link>
        </s-paragraph>
        <s-paragraph className="tr-app-routes-app-index22-s-paragraph-39">
          <s-text className="tr-app-routes-app-index22-s-text-40">Custom data: </s-text>
          <s-link
            href="https://shopify.dev/docs/apps/build/custom-data"
            target="_blank"
           className="tr-app-routes-app-index22-s-link-41">
            Metafields &amp; metaobjects
          </s-link>
        </s-paragraph>
        <s-paragraph className="tr-app-routes-app-index22-s-paragraph-42">
          <s-text className="tr-app-routes-app-index22-s-text-43">Database: </s-text>
          <s-link href="https://www.prisma.io/" target="_blank" className="tr-app-routes-app-index22-s-link-44">
            Prisma
          </s-link>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Next steps" className="tr-app-routes-app-index22-s-section-45">
        <s-unordered-list className="tr-app-routes-app-index22-s-unordered-list-46">
          <s-list-item className="tr-app-routes-app-index22-s-list-item-47">
            Build an{" "}
            <s-link
              href="https://shopify.dev/docs/apps/getting-started/build-app-example"
              target="_blank"
             className="tr-app-routes-app-index22-s-link-48">
              example app
            </s-link>
          </s-list-item>
          <s-list-item className="tr-app-routes-app-index22-s-list-item-49">
            Explore Shopify&apos;s API with{" "}
            <s-link
              href="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
              target="_blank"
             className="tr-app-routes-app-index22-s-link-50">
              GraphiQL
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
