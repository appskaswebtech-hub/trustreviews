import { Link, useLoaderData, useSubmit, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useState } from "react";
import { notifyIntegrations } from "../utils/events.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") || "all";

  const store = await db.store.findUnique({
    where: { shop: session.shop },
    select: { id: true },
  });

  if (!store) {
    return { grouped: [], allCount: 0, pendingCount: 0, answeredCount: 0, rejectedCount: 0, tab };
  }

  const where = { storeId: store.id };
  if (tab === "pending")  where.status = "pending";
  if (tab === "answered") where.status = "answered";
  if (tab === "rejected") where.status = "rejected";

  const questions = await db.question.findMany({
    where,
    include: { product: { select: { shopifyProductId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const productIds = [
    ...new Set(questions.map((q) => q.product.shopifyProductId).filter((id) => /^\d+$/.test(id))),
  ];

  const products = Object.fromEntries(
    (
      await Promise.all(
        productIds.map(async (productId) => {
          try {
            const response = await admin.graphql(
              `{ product(id:"gid://shopify/Product/${productId}"){title featuredImage{url}} }`,
            );
            const data = await response.json();
            const product = data?.data?.product;
            return [productId, product ? { title: product.title, image: product.featuredImage?.url } : null];
          } catch {
            return [productId, null];
          }
        }),
      )
    ).filter(([, value]) => value),
  );

  const enriched = questions.map((q) => ({
    ...q,
    storefrontProductId: q.product.shopifyProductId,
    productTitle: products[q.product.shopifyProductId]?.title || "Unknown Product",
    productImage: products[q.product.shopifyProductId]?.image,
  }));

  const grouped = {};
  for (const q of enriched) {
    if (!grouped[q.storefrontProductId]) {
      grouped[q.storefrontProductId] = {
        productId: q.storefrontProductId,
        productTitle: q.productTitle,
        productImage: q.productImage,
        questions: [],
      };
    }
    grouped[q.storefrontProductId].questions.push(q);
  }

  const [allCount, pendingCount, answeredCount, rejectedCount] = await Promise.all([
    db.question.count({ where: { storeId: store.id } }),
    db.question.count({ where: { storeId: store.id, status: "pending" } }),
    db.question.count({ where: { storeId: store.id, status: "answered" } }),
    db.question.count({ where: { storeId: store.id, status: "rejected" } }),
  ]);

  return { grouped: Object.values(grouped), allCount, pendingCount, answeredCount, rejectedCount, tab };
};

// Fires the "Question Answered" Flow trigger so merchants can wire it to a
// Flow email action (e.g. FlowMail/Flow Transactional Email) that supports a
// dynamic recipient — Shopify's own built-in "Send internal email" action
// can't target a variable address, so we can't notify the customer with it.
async function notifyQuestionAnswered(admin, shop, id) {
  const answered = await db.question.findUnique({
    where: { id },
    include: { product: { select: { shopifyProductId: true } } },
  });

  if (!answered?.email) return;

  notifyIntegrations(shop, {
    metricName: "Question Answered",
    email: answered.email,
    properties: { customer: answered.customer || "", question: answered.question, answer: answered.answer },
  }).catch((error) => console.error("notifyIntegrations failed:", error.message));

  let productTitle = "your product";
  try {
    const response = await admin.graphql(
      `{ product(id:"gid://shopify/Product/${answered.product.shopifyProductId}"){title} }`,
    );
    const data = await response.json();
    productTitle = data?.data?.product?.title || productTitle;
  } catch {
    // Product lookup is best-effort; fall back to the generic title.
  }

  try {
    await admin.graphql(
      `#graphql
      mutation TriggerQuestionAnswered($handle: String!, $payload: JSON!) {
        flowTriggerReceive(handle: $handle, payload: $payload) {
          userErrors { field message }
        }
      }`,
      {
        variables: {
          handle: "question-answered",
          payload: {
            "Customer Email": answered.email,
            "Customer Name": answered.customer || "",
            "Product Title": productTitle,
            "Question": answered.question,
            "Answer": answered.answer,
          },
        },
      },
    );
  } catch (error) {
    console.error("flowTriggerReceive failed", error);
  }
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const id = Number(formData.get("id"));
  const answer = formData.get("answer");

  const store = await db.store.findUnique({ where: { shop: session.shop }, select: { id: true } });

  if (actionType === "answer" && store) {
    await db.question.updateMany({
      where: { id, storeId: store.id },
      data: { answer: String(answer || "").trim(), status: "answered", answeredAt: new Date() },
    });

    await notifyQuestionAnswered(admin, session.shop, id);
  }
  if (actionType === "reject" && store) {
    await db.question.updateMany({ where: { id, storeId: store.id }, data: { status: "rejected" } });
  }
  if (actionType === "delete" && store) {
    await db.question.deleteMany({ where: { id, storeId: store.id } });
  }

  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") || "all";
  return new Response(null, { status: 302, headers: { Location: `/app/widgets/qa-manage?tab=${tab}` } });
};

const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78",
  accent: "#4C6FFF", accentLt: "#eaf0ff",
  green: "#1f7a4d", greenLt: "#e7f4ec",
  amber: "#a3690f", amberLt: "#f7f0e2",
  red:   "#a5423b", redLt:   "#f7eae8",
};

const statusStyle = (s) =>
  s === "answered" ? { bg: C.greenLt, color: C.green, dot: C.green }
  : s === "pending" ? { bg: C.amberLt, color: C.amber, dot: C.amber }
  : { bg: C.redLt, color: C.red, dot: C.red };

function QuestionRow({ question, onAction }) {
  const [answerText, setAnswerText] = useState(question.answer || "");
  const ss = statusStyle(question.status);

  return (
    <div style={{ padding: "16px 18px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", background: C.accentLt,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 600, fontSize: 12, color: C.accent, flexShrink: 0,
        }}>{(question.customer || "?")[0].toUpperCase()}</div>
        <strong style={{ fontSize: 13 }}>{question.customer}</strong>
        {question.email && <span style={{ color: C.muted, fontSize: 12 }}>{question.email}</span>}
        <span style={{
          marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
          background: ss.bg, color: ss.color, borderRadius: 20, padding: "3px 11px",
          fontSize: 11, fontWeight: 600,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ss.dot }} />
          {question.status}
        </span>
        <span style={{ color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>
          {new Date(question.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>
      <p style={{ fontSize: 13, color: C.text, margin: "0 0 10px" }}>{question.question}</p>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <textarea
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Type an answer…"
          style={{
            flex: 1, minHeight: 56, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "8px 10px", fontSize: 13, fontFamily: "inherit", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={() => onAction("answer", question, answerText)}
            disabled={!answerText.trim()}
            style={{
              border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600,
              cursor: answerText.trim() ? "pointer" : "default",
              background: answerText.trim() ? C.greenLt : "#f3f4f6",
              color: answerText.trim() ? C.green : C.muted,
            }}
          >✓ {question.status === "answered" ? "Update Answer" : "Answer"}</button>
          <button
            onClick={() => onAction("reject", question)}
            style={{ border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: C.redLt, color: C.red }}
          >✕ Reject</button>
          <button
            onClick={() => onAction("delete", question)}
            style={{ border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#f3f4f6", color: C.muted }}
          >Delete</button>
        </div>
      </div>
    </div>
  );
}

function ProductGroup({ group, onAction }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: C.surface, borderRadius: 14, marginBottom: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer", background: open ? "#fafbff" : C.surface }}
      >
        <img
          src={group.productImage || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
          alt={group.productTitle}
          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: `1px solid ${C.border}` }}
        />
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: C.text }}>{group.productTitle}</span>
        <span style={{ fontSize: 11, fontWeight: 600, background: C.accentLt, color: C.accent, borderRadius: 20, padding: "3px 10px" }}>
          {group.questions.length} {group.questions.length !== 1 ? "questions" : "question"}
        </span>
      </div>
      {open && group.questions.map((q) => <QuestionRow key={q.id} question={q} onAction={onAction} />)}
    </div>
  );
}

export default function QaManagePage() {
  const { grouped, allCount, pendingCount, answeredCount, rejectedCount, tab } = useLoaderData();
  const submit = useSubmit();
  const [, setSearchParams] = useSearchParams();

  const handleAction = (actionType, question, answer = null) => {
    const fd = new FormData();
    fd.append("actionType", actionType);
    fd.append("id", question.id);
    if (answer !== null) fd.append("answer", answer);
    submit(fd, { method: "post" });
  };

  const TABS = [
    { key: "all",      label: "All Questions", count: allCount      },
    { key: "pending",  label: "Pending",       count: pendingCount  },
    { key: "answered", label: "Answered",      count: answeredCount },
    { key: "rejected", label: "Rejected",      count: rejectedCount },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: "28px" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <Link to="/app/widgets/qa" style={{ fontSize: 16, color: C.text, textDecoration: "none" }}>←</Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: 0 }}>Manage Questions</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>Answer customer questions shown on your product pages.</p>
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "12px 18px", marginBottom: 18, display: "flex", gap: 4 }}>
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setSearchParams({ tab: key })}
            style={{
              border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: tab === key ? C.accent : "transparent", color: tab === key ? "#fff" : C.muted,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {label}
            <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 20, padding: "1px 7px", background: tab === key ? "rgba(255,255,255,.25)" : C.border, color: tab === key ? "#fff" : C.muted }}>{count}</span>
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px dashed ${C.border}`, padding: 60, textAlign: "center", color: C.muted, fontSize: 14 }}>
          No questions found for the current filter.
        </div>
      ) : (
        grouped.map((g) => <ProductGroup key={g.productId} group={g} onAction={handleAction} />)
      )}
    </div>
  );
}
