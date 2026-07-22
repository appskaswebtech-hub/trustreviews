import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import "@shopify/polaris/build/esm/styles.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const store = await prisma.store.findUnique({
    where: { shop: session.shop },
    select: { language: true },
  });

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    lang: store?.language || "en",
  };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisProvider i18n={enTranslations}>
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>

          <Link to="/app/widgets">
            Widgets
          </Link>

          <Link to="/app/widget-settings">
            Settings
          </Link>

          <Link to="/app/review-groups">
            Product Groups
          </Link>

          {/* <Link to="/app/customize">
            Customize
          </Link> */}

          <Link to="/app/integrations">
            Integrations
          </Link>

          <Link to="/app/custom-code">
            Custom Code
          </Link>

          <Link to="/app/billing">
            Billing
          </Link>
        </NavMenu>

        <Outlet />
      </PolarisProvider>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};