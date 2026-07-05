import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";

interface ProductShelfProps {
  title: string;
  subtitle: string;
  products: any[];
}

function ProductShelf({ title, subtitle, products }: ProductShelfProps) {
  if (!products || products.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 py-4 select-none animate-in fade-in duration-300">
      <div>
        <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
        <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {products.map((item) => {
          const bestMatch = [...(item.matches || [])].sort((a, b) => {
            const pa = parseInt(a.price.replace(/[^0-9]/g, ""), 10) || Infinity;
            const pb = parseInt(b.price.replace(/[^0-9]/g, ""), 10) || Infinity;
            return pa - pb;
          })[0];

          return (
            <div
              key={item.id}
              className="flex flex-col w-[170px] flex-shrink-0 bg-zinc-900/40 border border-zinc-850 hover:border-zinc-800 p-3 rounded-2xl transition-all group"
            >
              {/* Image & Hover Effect */}
              <div className="w-full aspect-[4/5] rounded-xl overflow-hidden border border-zinc-850 bg-zinc-950 mb-3 relative">
                <img
                  src={item.thumbnailUrl || item.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                  alt={item.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Verified badge */}
                {item.isVerifiedMatch && (
                  <span className="absolute top-2 left-2 text-[8px] font-extrabold text-amber-500 bg-black/85 px-1.5 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-wide">
                    ✓ Verified
                  </span>
                )}
              </div>

              {/* Creator details */}
              <div className="flex items-center gap-1.5 mb-2 min-w-0">
                <UserAvatar
                  avatarUrl={item.post?.user?.avatarUrl}
                  size={16}
                  className="size-4.5 rounded-full"
                />
                <Link
                  href={`/users/${item.post?.user?.username}`}
                  className="text-[9px] font-bold text-zinc-400 hover:text-white truncate"
                >
                  @{item.post?.user?.username}
                </Link>
              </div>

              {/* Product Label */}
              <span className="text-[12px] font-black text-white capitalize truncate block w-full leading-tight">
                {item.label}
              </span>

              {/* Best Price Offer */}
              {bestMatch ? (
                <div className="flex items-center justify-between gap-1 mt-2.5 w-full">
                  <span className="text-[11px] font-extrabold text-amber-500 truncate">
                    {bestMatch.price}
                  </span>
                  <span className="text-[8px] text-zinc-500 font-extrabold truncate">
                    {bestMatch.sourceStore}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-zinc-650 italic mt-2.5">No offers</span>
              )}

              {/* View Look link */}
              <Link
                href={`/posts/${item.postId}`}
                className="mt-3 w-full py-1.5 bg-zinc-950 text-center rounded-lg text-[10px] font-bold text-zinc-300 hover:bg-zinc-850 hover:text-white transition-colors"
              >
                Shop Look
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function Page() {
  const { user } = await validateRequest();
  if (!user) {
    redirect("/login");
  }

  // 1. Trending Looks (highest click count)
  const trendingProducts = await prisma.detectedProduct.findMany({
    where: {
      matches: {
        some: {
          clickCount: { gte: 1 },
        },
      },
    },
    include: {
      matches: true,
      post: {
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    take: 10,
  });

  // 2. Most Saved (highest saved collection item counts)
  const mostSavedProducts = await prisma.detectedProduct.findMany({
    include: {
      matches: true,
      post: {
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      collectionItems: {
        _count: "desc",
      },
    },
    take: 10,
  });

  // 3. Travel Style
  const travelProducts = await prisma.detectedProduct.findMany({
    where: {
      OR: [
        { style: { equals: "Travel", mode: "insensitive" } },
        { label: { contains: "travel", mode: "insensitive" } },
        { label: { contains: "backpack", mode: "insensitive" } },
        { keywords: { has: "travel" } },
      ],
    },
    include: {
      matches: true,
      post: {
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    take: 10,
  });

  // 4. Streetwear
  const streetwearProducts = await prisma.detectedProduct.findMany({
    where: {
      OR: [
        { style: { equals: "Streetwear", mode: "insensitive" } },
        { label: { contains: "streetwear", mode: "insensitive" } },
        { label: { contains: "sneaker", mode: "insensitive" } },
        { label: { contains: "hoodie", mode: "insensitive" } },
        { keywords: { has: "streetwear" } },
      ],
    },
    include: {
      matches: true,
      post: {
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    take: 10,
  });

  // 5. Creator Picks (verified creators)
  const creatorProducts = await prisma.detectedProduct.findMany({
    where: {
      post: {
        user: {
          verified: true,
        },
      },
    },
    include: {
      matches: true,
      post: {
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    take: 10,
  });

  // 6. Recently Detected
  const recentlyDetected = await prisma.detectedProduct.findMany({
    include: {
      matches: true,
      post: {
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  // Fallbacks if tables are sparse on data
  const allProducts = await prisma.detectedProduct.findMany({
    include: {
      matches: true,
      post: {
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    take: 10,
  });

  const trending = trendingProducts.length > 0 ? trendingProducts : allProducts;
  const mostSaved = mostSavedProducts.length > 0 ? mostSavedProducts : allProducts;
  const travel = travelProducts.length > 0 ? travelProducts : allProducts.slice(0, 5);
  const streetwear = streetwearProducts.length > 0 ? streetwearProducts : allProducts.slice(5, 10);
  const creatorPicks = creatorProducts.length > 0 ? creatorProducts : allProducts;
  const recent = recentlyDetected.length > 0 ? recentlyDetected : allProducts;

  return (
    <div className="mx-auto w-full max-w-[600px] bg-background border-x border-border/40 min-h-screen px-4 md:px-6 py-6 pb-20 sm:pb-6">
      {/* Shop Header */}
      <div className="flex items-center gap-2 mb-6 border-b border-border/30 pb-4">
        <span className="text-2xl leading-none">🛍</span>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Shop Hub</h1>
          <p className="text-xs text-zinc-400 font-bold">Discover shoppable looks from creator videos</p>
        </div>
      </div>

      {/* Visual Discovery Shelves */}
      <div className="flex flex-col gap-4">
        <ProductShelf
          title="🔥 Trending Looks"
          subtitle="Most popular items shopped today"
          products={trending}
        />
        <div className="border-b border-zinc-900/60 my-1" />
        <ProductShelf
          title="📂 Most Saved"
          subtitle="Top fashion items saved to boards"
          products={mostSaved}
        />
        <div className="border-b border-zinc-900/60 my-1" />
        <ProductShelf
          title="✈️ Travel Style"
          subtitle="Travel-ready apparel and accessories"
          products={travel}
        />
        <div className="border-b border-zinc-900/60 my-1" />
        <ProductShelf
          title="👟 Streetwear Styles"
          subtitle="Oversized fits and trending sneakers"
          products={streetwear}
        />
        <div className="border-b border-zinc-900/60 my-1" />
        <ProductShelf
          title="⭐️ Creator Picks"
          subtitle="Curated styles from verified fashion creators"
          products={creatorPicks}
        />
        <div className="border-b border-zinc-900/60 my-1" />
        <ProductShelf
          title="⏰ Recently Detected"
          subtitle="Fresh looks straight out of the processing queue"
          products={recent}
        />
      </div>
    </div>
  );
}
