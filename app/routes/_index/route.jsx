import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>A short heading about [your app]</h1>
        <p className={styles.text}>
          A tagline about [your app] that describes your value proposition.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span className="tr-app-routes-index-route-span-1">Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span className="tr-app-routes-index-route-span-2">e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li className="tr-app-routes-index-route-li-3">
            <strong className="tr-app-routes-index-route-strong-4">Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li className="tr-app-routes-index-route-li-5">
            <strong className="tr-app-routes-index-route-strong-6">Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li className="tr-app-routes-index-route-li-7">
            <strong className="tr-app-routes-index-route-strong-8">Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
        </ul>
      </div>
    </div>
  );
}
