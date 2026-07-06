CREATE TABLE "news_posts" ("id" TEXT NOT NULL,"title" TEXT NOT NULL,"slug" TEXT NOT NULL,"excerpt" TEXT NOT NULL,"content" TEXT NOT NULL,"imageUrl" TEXT NOT NULL,"eventDate" TIMESTAMP(3) NOT NULL,"isPublished" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "news_posts_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "news_posts_slug_key" ON "news_posts"("slug");
CREATE INDEX "news_posts_isPublished_eventDate_idx" ON "news_posts"("isPublished","eventDate");
