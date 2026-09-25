PRAGMA foreign_keys=OFF;

CREATE TABLE "Store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "new_Review" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "email" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TEMP TABLE "_ReviewMigration" AS
SELECT
    "id" AS "legacyId",
    CASE
        WHEN TRIM(COALESCE("shop", '')) = '' THEN 'unknown-shop-' || "id"
        ELSE TRIM("shop")
    END AS "shop",
    CASE
        WHEN TRIM(COALESCE("productId", '')) = '' THEN 'legacy-' || "id"
        ELSE REPLACE(TRIM("productId"), 'gid://shopify/Product/', '')
    END AS "normalizedProductId",
    NULLIF(LOWER(TRIM(COALESCE("email", ''))), '') AS "email",
    CASE
        WHEN "rating" BETWEEN 1 AND 5 THEN "rating"
        ELSE 5
    END AS "rating",
    COALESCE("comment", '') AS "comment",
    CASE
        WHEN TRIM(COALESCE("customer", '')) = '' THEN 'Unknown'
        ELSE TRIM("customer")
    END AS "customer",
    COALESCE("likes", 0) AS "likes",
    CASE LOWER(TRIM(COALESCE("status", 'pending')))
        WHEN 'approved' THEN 'approved'
        WHEN 'rejected' THEN 'rejected'
        ELSE 'pending'
    END AS "status",
    COALESCE("createdAt", CURRENT_TIMESTAMP) AS "createdAt"
FROM "Review";

INSERT INTO "Store" ("shop", "createdAt")
SELECT
    "shop",
    MIN("createdAt")
FROM "_ReviewMigration"
GROUP BY "shop";

INSERT INTO "Product" ("storeId", "shopifyProductId", "createdAt")
SELECT
    "Store"."id",
    "_ReviewMigration"."normalizedProductId",
    MIN("_ReviewMigration"."createdAt")
FROM "_ReviewMigration"
INNER JOIN "Store" ON "Store"."shop" = "_ReviewMigration"."shop"
GROUP BY "Store"."id", "_ReviewMigration"."normalizedProductId";

INSERT INTO "new_Review" (
    "id",
    "storeId",
    "productId",
    "email",
    "rating",
    "comment",
    "customer",
    "likes",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    "_ReviewMigration"."legacyId",
    "Store"."id",
    "Product"."id",
    "_ReviewMigration"."email",
    "_ReviewMigration"."rating",
    "_ReviewMigration"."comment",
    "_ReviewMigration"."customer",
    "_ReviewMigration"."likes",
    "_ReviewMigration"."status",
    "_ReviewMigration"."createdAt",
    "_ReviewMigration"."createdAt"
FROM "_ReviewMigration"
INNER JOIN "Store" ON "Store"."shop" = "_ReviewMigration"."shop"
INNER JOIN "Product"
    ON "Product"."storeId" = "Store"."id"
   AND "Product"."shopifyProductId" = "_ReviewMigration"."normalizedProductId";

DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
DROP TABLE "_ReviewMigration";

CREATE UNIQUE INDEX "Store_shop_key" ON "Store"("shop");
CREATE UNIQUE INDEX "Product_storeId_shopifyProductId_key" ON "Product"("storeId", "shopifyProductId");
CREATE INDEX "Review_storeId_status_createdAt_idx" ON "Review"("storeId", "status", "createdAt");
CREATE INDEX "Review_storeId_productId_status_createdAt_idx" ON "Review"("storeId", "productId", "status", "createdAt");

PRAGMA foreign_keys=ON;
