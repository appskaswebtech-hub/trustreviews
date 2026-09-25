export default function AdditionalPage() {
  return (
    <s-page heading="Additional page" className="tr-app-routes-app-additional-s-page-1">
      <s-section heading="Multiple pages" className="tr-app-routes-app-additional-s-section-2">
        <s-paragraph className="tr-app-routes-app-additional-s-paragraph-3">
          The app template comes with an additional page which demonstrates how
          to create multiple pages within app navigation using{" "}
          <s-link
            href="https://shopify.dev/docs/apps/tools/app-bridge"
            target="_blank"
           className="tr-app-routes-app-additional-s-link-4">
            App Bridge
          </s-link>
          .
        </s-paragraph>
        <s-paragraph className="tr-app-routes-app-additional-s-paragraph-5">
          To create your own page and have it show up in the app navigation, add
          a page inside <code className="tr-app-routes-app-additional-code-6">app/routes</code>, and a link to it in the{" "}
          <code className="tr-app-routes-app-additional-code-7">&lt;ui-nav-menu&gt;</code> component found in{" "}
          <code className="tr-app-routes-app-additional-code-8">app/routes/app.jsx</code>.
        </s-paragraph>
      </s-section>
      <s-section slot="aside" heading="Resources" className="tr-app-routes-app-additional-s-section-9">
        <s-unordered-list className="tr-app-routes-app-additional-s-unordered-list-10">
          <s-list-item className="tr-app-routes-app-additional-s-list-item-11">
            <s-link
              href="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
              target="_blank"
             className="tr-app-routes-app-additional-s-link-12">
              App nav best practices
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
