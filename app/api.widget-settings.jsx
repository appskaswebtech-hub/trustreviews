import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// GET - load settings
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const settings = await prisma.widgetSettings.findUnique({
    where: { shop: session.shop },
  });

  return data(
    settings || {
      starColor:     "#F59E0B",
      starSize:      15,
      countColor:    "#6B7280",
      countFontSize: 12,
      showEmpty:     false,
      borderRadius:  4,
      background:    "#FFFFFF",
      widgetStyle:   "compact",   // ← NEW default
    }
  );
}

// POST - save settings
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  const settings = await prisma.widgetSettings.upsert({
    where: { shop: session.shop },
    update: {
      starColor:     body.starColor,
      starSize:      Number(body.starSize),
      countColor:    body.countColor,
      countFontSize: Number(body.countFontSize),
      showEmpty:     Boolean(body.showEmpty),
      borderRadius:  Number(body.borderRadius),
      background:    body.background,
      widgetStyle:   body.widgetStyle   || "compact",   // ← NEW
    },
    create: {
      shop:          session.shop,
      starColor:     body.starColor     || "#F59E0B",
      starSize:      Number(body.starSize)      || 15,
      countColor:    body.countColor    || "#6B7280",
      countFontSize: Number(body.countFontSize) || 12,
      showEmpty:     Boolean(body.showEmpty)    || false,
      borderRadius:  Number(body.borderRadius)  || 4,
      background:    body.background    || "#FFFFFF",
      widgetStyle:   body.widgetStyle   || "compact",   // ← NEW
    },
  });

  return data({ success: true, settings });
}