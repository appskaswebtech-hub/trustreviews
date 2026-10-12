import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import globalStyles from "./global.css?url";

export const links = () => [{ rel: "stylesheet", href: globalStyles }];

export default function App() {
  return (
    <html lang="en" className="tr-app-root-html-1">
      <head className="tr-app-root-head-2">
        <meta charSet="utf-8"  className="tr-app-root-meta-3"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"  className="tr-app-root-meta-4"/>
        <link rel="preconnect" href="https://cdn.shopify.com/"  className="tr-app-root-link-5"/>
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
         className="tr-app-root-link-6"/>
        <Meta />
        <Links />
      </head>
      <body className="tr-app-root-body-8">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
