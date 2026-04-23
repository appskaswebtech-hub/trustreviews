CREATE TABLE IF NOT EXISTS "Review" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "productImage" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
