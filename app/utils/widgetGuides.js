// "How does this widget work?" guide shown from the ⓘ icon on each widget card
// (app/routes/app.widgets.jsx). Built from the catalog (widgetCatalog.js) so
// install steps always match what the Install button really does.

import { editorTemplateFor, editorTargetFor } from "./widgetCatalog";

// Widgets that are one design of the "Reviews Showcase" theme block.
const SHOWCASE_KEYS = new Set([
  "review_widget", "cards_carousel", "testimonial_carousel", "videos_carousel", "popup_reviews",
  "single_review", "summary_list", "classic_list", "review_snippets", "happy_customers", "reviews_grid",
  "insta_stories", "hero_quote_carousel", "coverflow_carousel", "split_media_carousel", "floating_reviews_tab",
]);

// Small badges that move themselves inside the product info (snippets/block-position.liquid).
const SPOTS = {
  inline_rating: "under_title",
  star_rating_badge: "under_title",
  verified_counter: "under_title",
  trust_medals: "under_buy_buttons",
  ai_reviews_summary: "under_buy_buttons",
};

// Where it shows on the store, plus anything the merchant must know first.
const DETAILS = {
  review_wall: {
    where: "Any page — best on its own \"Reviews\" page. Shows every approved review from your whole store in a searchable grid.",
    tip: "Create a page in Online Store → Pages (e.g. \"Reviews\"), then add this block to that page's template.",
  },
  homepage_reviews: {
    where: "Home page — its own full-width section.",
    tip: "Shows only reviews tagged \"Home\". Add the tag from any review's tag editor on the Reviews page (CSV imports without a product get it automatically).",
  },
  custom_template: {
    where: "Product page or home page — its own section, drawn from the design you build on the Customize page.",
  },
  inline_rating: {
    where: "Product page — right under the product title (e.g. ★★★★★ 4.6 out of 5 based on 12 reviews).",
    tip: "Want stars somewhere else too (collection cards, near the price)? Copy the snippet from Custom Code → Snippets.",
  },
  star_rating_badge: {
    where: "Product page — right under the product title, as a compact badge.",
    tip: "Badge style (compact, card, pill…) and colors are set in Custom Code → Settings.",
  },
  verified_counter: {
    where: "Product page — right under the product title (e.g. ✓ 12 verified reviews).",
  },
  trust_medals: {
    where: "Product page — under the Add to cart / Buy buttons, as a trust badge with rating and review count.",
  },
  ai_reviews_summary: {
    where: "Product page — under the Add to cart / Buy buttons. A short AI-written summary of what customers say.",
    tip: "Generate the summary for a product from the AI Reviews Summary page first — the block stays hidden until a summary exists.",
  },
  reviews_summary: {
    where: "Product page — its own section: rating breakdown, review list, sort, pagination and the Write a Review button.",
  },
  write_review: {
    where: "Product page — its own section. Shows the product's reviews with the Write a Review button and form.",
    tip: "This and \"Reviews List Style\" are the same \"Reviews + Write a Review\" block — install it once; each page here styles a different part.",
  },
  review_list: {
    where: "Product page — the review list inside the \"Reviews + Write a Review\" section.",
    tip: "Same block as \"Reviews + Write a Review\" — install it once; this page styles the list, the other styles the form.",
  },
  questions_answers: {
    where: "Product page — its own section. Shoppers ask questions; answered ones show on the product.",
    tip: "Answer new questions in the app: Widgets → Questions & Answers → Manage questions.",
  },
  collection_ratings: {
    where: "Every product card — collection pages, featured collection and featured product on the home page, search results and related products on a product page. Right under the product name.",
    tip: "Shows only on products with approved reviews (or grey stars, if you turn that on). Stores that never switch it on are not affected.",
  },
  all_reviews_counter: {
    where: "Any page — total number of reviews in your store and the average rating.",
  },
  google_reviews: {
    where: "Any page — your store's Google rating and reviews.",
    tip: "Advanced plan. Connect your Google Business / pick your place on the Google Reviews page first.",
  },
  instagram_shopping: {
    where: "Home page — your Instagram and Facebook reels and videos.",
    tip: "First connect your Instagram / Facebook on the Instagram & Facebook page in the app, then add the block.",
  },
  instagram_feed: {
    where: "Home page — your latest Instagram posts, reels and carousels.",
    tip: "First connect your Instagram (Business or Creator account) on the Instagram & Facebook page in the app, then add the block.",
  },
  instagram_stories: {
    where: "Home page — a story circle that opens your live Instagram stories.",
    tip: "Instagram shares stories for 24 hours only (not Highlights), so the circle appears only while you have a live story.",
  },
  customer_accounts: {
    where: "Customer account pages, like the order confirmation / order status page — customers write and view their reviews there.",
    tip: "Uses a Customer Account extension, not a theme block, so nothing is added in the Theme Editor.",
  },
};

const TEMPLATE_LABEL = { product: "product page", index: "home page" };

export function guideFor(widget) {
  const details = DETAILS[widget.key] || {};
  const showcase = SHOWCASE_KEYS.has(widget.key);
  const isPopup = widget.key === "popup_reviews" || widget.key === "floating_reviews_tab";

  const where = details.where || (isPopup
    ? "Product page — floats over the page (pop-up / side tab), so where you place the block doesn't matter."
    : "Product page — its own full-width section, usually below the product details. Works on the home page too (shows reviews from the whole store there).");

  const steps = [];
  if (widget.embedHandle) {
    steps.push("Click Install — Shopify's Theme Editor opens on App embeds with \"" + widget.title + "\" already switched on.");
    steps.push("Press Save — stars now show on product cards across your store.");
    steps.push("To change star color, size, text or where it shows, open Customize → App embeds → " + widget.title + ". Switch it off there to stop it everywhere.");
  } else if (widget.blockHandle) {
    steps.push(`Click Configure to pick the design, colors and texts — preview updates live — then Save.`);
    const page = TEMPLATE_LABEL[editorTemplateFor(widget.blockHandle)] || "product page";
    steps.push(`Click Install — Shopify's Theme Editor opens on your ${page}.`);
    if (editorTargetFor(widget.blockHandle) === "mainSection") {
      steps.push(SPOTS[widget.key] === "under_buy_buttons"
        ? "The block is added to the product info and moves itself under the buy buttons."
        : "The block is added to the product info and moves itself under the product title.");
    } else if (showcase) {
      steps.push(`A "Reviews Showcase" block is added in a new section, already set to show "${widget.title}". Drag the section up or down if you like.`);
    } else {
      steps.push("The block is added in a new section. Drag it up or down if you like.");
    }
    steps.push("Press Save in the Theme Editor — it's live on your store.");
  } else {
    steps.push("Click Learn more and follow the setup on that page.");
  }

  return {
    where,
    steps,
    tip: details.tip || (showcase
      ? "One \"Reviews Showcase\" block can show any of these designs — change it anytime in the block's \"Show this widget\" setting."
      : null),
  };
}
