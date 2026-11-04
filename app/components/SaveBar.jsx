import { useEffect } from "react";

// Shopify's Contextual Save Bar (App Bridge <ui-save-bar>). Shown while `dirty`
// is true; Shopify also blocks in-app navigation until the merchant saves or
// discards. See https://shopify.dev/docs/api/app-bridge-library/apis/save-bar
export default function SaveBar({ id, dirty, saving = false, onSave, onDiscard, saveLabel, discardLabel }) {
  useEffect(() => {
    const bar = window.shopify?.saveBar;
    if (!bar) return undefined;
    if (dirty) bar.show(id)?.catch?.(() => {});
    else bar.hide(id)?.catch?.(() => {});
    return undefined;
  }, [id, dirty]);

  // Don't leave the bar up if this page unmounts while dirty.
  useEffect(() => () => { window.shopify?.saveBar?.hide(id)?.catch?.(() => {}); }, [id]);

  return (
    <ui-save-bar id={id}>
      <button variant="primary" onClick={onSave} {...(saving ? { loading: "" } : {})}>{saveLabel}</button>
      <button onClick={onDiscard}>{discardLabel}</button>
    </ui-save-bar>
  );
}
