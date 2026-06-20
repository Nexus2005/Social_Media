# Product Extraction & Shopping Links — Implementation Plan

## Goal
Add a feature to the existing video-based social app: when a video is uploaded or viewed, automatically detect purchasable items visible in it (clothing, footwear, bags, accessories) and show the user direct purchase links to buy matching items from existing e-commerce platforms (Amazon, Flipkart, Myntra, etc.).

**Explicitly in scope:** detection + outbound shopping links only.
**Explicitly out of scope (do not build yet):** any payment/checkout, an owned product catalog, seller accounts, recommendations, virtual try-on, affiliate tagging.

---

## API Keys & Tools

| Need | Type | Why | Required for MVP? |
|---|---|---|---|
| Google Vision API | API key (have) | Detect objects in video frames + get descriptive labels | Yes |
| SerpApi | API key (have) | Real shopping results — price, store, direct link — across many e-commerce sites in one call | Yes |
| FFmpeg | Free CLI tool, no key | Extract frames from uploaded videos | Yes |
| Vision-capable LLM (OpenRouter Gemini/GPT) | API key (have) | Turns a generic Vision API label into a specific, shoppable description (e.g. "Jacket" → "black cropped moto leather jacket, gold zip") | Strongly recommended, not strictly required |
| Background fetch / trigger | Server Route | Runs the detection pipeline in the background after upload | Yes |

---

## System Flow

```
1. User uploads video        → stored as usual in your existing flow
2. On upload success         → trigger background fetch: process-reel(postId)
3. Background job:
     a. Extract 5–8 evenly-spaced frames with ffmpeg
     b. Each frame → Google Vision OBJECT_LOCALIZATION
          → bounding boxes for "Clothing", "Footwear", "Bag", "Sunglasses", etc.
          → ignore "Person" and background objects
     c. Crop each bounding box out of its frame
     d. Each crop → Google Vision WEB_DETECTION (+ vision LLM call via OpenRouter)
          → produces a specific, descriptive label
     e. Deduplicate across all frames — merge near-identical descriptions
        so the same jacket isn't listed 6 times
     f. Each unique item → SerpApi, engine=google_shopping, q=<description>
          → returns title, price, source store, direct link, thumbnail
     g. Save results to detected_products + shopping_matches, linked to postId
4. Frontend, on opening a video:
     → GET /api/posts/[postId]/status
     → if results exist, show a shopping-bag icon over the video
     → tapping it opens a panel listing each item with its top matches grouped by category
     → "Buy" opens the link in a new tab
```

---

## Data Model Additions

```
detected_products
  id
  postId           (FK → existing posts table)
  label            ("black cropped leather jacket")
  category         ("Clothing & Apparel" / "Footwear" / "Electronics & Accessories")
  box              (Bounding box Json coordinates)
  thumbnailUrl     (optional/cropped image url)
  createdAt

shopping_matches
  id
  detectedProductId   (FK → detected_products)
  title
  price
  currency
  sourceStore          (e.g. "Amazon.in", "Flipkart" — comes from SerpApi)
  productUrl           (the buy link — comes from SerpApi)
  imageUrl
```

---

## Backend Implementation Steps

1. Configure environment and dependencies.
2. Update Prisma schema to add `DetectedProduct` and `ShoppingMatch` models. Run `npx prisma db push`.
3. Update background job `/api/process-reel` to:
   - Extract frames.
   - Run `OBJECT_LOCALIZATION` to find relevant bounding boxes (clothing, footwear, accessories).
   - Crop the bounding box from the frame image (buffer/file).
   - Call Google Vision `WEB_DETECTION` on the cropped image buffer to get contextual tags, or send the cropped image/label to the OpenRouter Gemini API to get a detailed product query string.
   - Deduplicate items to prevent double listings.
   - Query SerpApi `google_shopping` for each deduplicated item and fetch matches.
   - Save the results into `DetectedProduct` and `ShoppingMatch` tables.
4. Update the post status check API to return `detectedProducts` with their nested `matches`.

## Frontend Implementation Steps

1. Update `ReelCard` to support displaying categorized products from `detectedProducts` and their matches `ShoppingMatch` loaded directly from the database (saving API calls).
2. Clean up hotspots to map to the new database products list.
