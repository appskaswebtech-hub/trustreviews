import { useEffect, useRef, useState } from "react";

// Shopify's own banner (Polaris web component <s-banner>), as described in
// https://shopify.dev/docs/apps/design/user-experience/alerts. The component is
// provided by the Polaris script that AppProvider loads, so it renders with
// Shopify's styling. tone: info | success | warning | critical.
export default function AlertBanner({ tone = "info", title, children, onDismiss, dismissible = Boolean(onDismiss), style }) {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !dismissible) return undefined;
    const onHide = () => { setHidden(true); onDismiss?.(); };
    node.addEventListener("dismiss", onHide);
    return () => node.removeEventListener("dismiss", onHide);
  }, [dismissible, onDismiss]);

  if (hidden) return null;
  return (
    <div style={style}>
      <s-banner ref={ref} tone={tone} heading={title} dismissible={dismissible ? "" : undefined}>
        {children}
      </s-banner>
    </div>
  );
}
