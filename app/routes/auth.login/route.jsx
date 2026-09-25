import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <s-page className="tr-app-routes-auth-login-route-s-page-1">
        <Form method="post">
          <s-section heading="Log in" className="tr-app-routes-auth-login-route-s-section-2">
            <s-text-field
              name="shop"
              label="Shop domain"
              details="example.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors.shop}
             className="tr-app-routes-auth-login-route-s-text-field-3"></s-text-field>
            <s-button type="submit" className="tr-app-routes-auth-login-route-s-button-4">Log in</s-button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}
