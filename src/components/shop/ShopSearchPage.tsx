"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Product } from "@/features/shop/types";
import { CartlyAdapter } from "@/features/shop/adapters/cartlyAdapter";
import { 
  Search, Mic, ChevronDown, MapPin, Heart, Bell, ShoppingBag, Menu,
  ChevronUp, X, Truck, Award, ShieldCheck, RefreshCw, 
  LayoutGrid, List, Shield, Star, ShoppingCart, Loader2, AlertTriangle,
  Sparkles, LayoutDashboard, PackageCheck, Store, Percent
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const cartlyAdapter = new CartlyAdapter();

interface SearchFilters {
  categories: string[];
  brands: string[];
  priceMin: number;
  priceMax: number;
}

const brandsList = [
  { name: "Apple", count: 234 },
  { name: "Samsung", count: 412 },
  { name: "OnePlus", count: 198 },
  { name: "Xiaomi", count: 367 },
  { name: "vivo", count: 211 },
  { name: "realme", count: 189 },
  { name: "Google", count: 96 },
];

const categoriesList = [
  { name: "Mobiles & Accessories", count: 2154 },
  { name: "Feature Phones", count: 312 },
  { name: "Phone Accessories", count: 8523 },
];

export default function ShopSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchVal, setSearchVal] = useState(query);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");

  const [filters, setFilters] = useState<SearchFilters>({
    categories: ["Mobiles & Accessories"],
    brands: ["Apple", "Samsung", "OnePlus"],
    priceMin: 10000,
    priceMax: 60000,
  });

  const [expandedSections, setExpandedSections] = useState({
    category: true,
    brand: true,
    price: true,
  });

  const [priceRange, setPriceRange] = useState({ min: 10000, max: 60000 });
  const [selectedPricePill, setSelectedPricePill] = useState<string | null>(null);

  const fetchResults = async (q: string) => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await cartlyAdapter.searchProducts(q);
      setProducts(data);
    } catch (e) {
      console.warn("Error running shop query search:", e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(query);
    setSearchVal(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/shop/search?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleBrandToggle = (brand: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  const handlePricePillSelect = (pill: string) => {
    setSelectedPricePill(pill);
    switch (pill) {
      case "Under ₹10,000":
        setPriceRange({ min: 0, max: 10000 });
        setFilters(prev => ({ ...prev, priceMin: 0, priceMax: 10000 }));
        break;
      case "₹10,000 - ₹20,000":
        setPriceRange({ min: 10000, max: 20000 });
        setFilters(prev => ({ ...prev, priceMin: 10000, priceMax: 20000 }));
        break;
      case "₹20,000 - ₹40,000":
        setPriceRange({ min: 20000, max: 40000 });
        setFilters(prev => ({ ...prev, priceMin: 20000, priceMax: 40000 }));
        break;
      case "Above ₹40,000":
        setPriceRange({ min: 40000, max: 100000 });
        setFilters(prev => ({ ...prev, priceMin: 40000, priceMax: 100000 }));
        break;
    }
  };

  const clearAllFilters = () => {
    setFilters({ categories: [], brands: [], priceMin: 0, priceMax: 100000 });
    setSelectedPricePill(null);
    setPriceRange({ min: 0, max: 100000 });
  };

  const removeFilter = (type: string, value?: string) => {
    if (type === "category") {
      setFilters(prev => ({ ...prev, categories: [] }));
    } else if (type === "brand") {
      setFilters(prev => ({ ...prev, brands: [] }));
    } else if (type === "price") {
      setFilters(prev => ({ ...prev, priceMin: 0, priceMax: 100000 }));
      setSelectedPricePill(null);
    }
  };

  const priceSliderLeft = (priceRange.min / 100000) * 100;
  const priceSliderRight = 100 - (priceRange.max / 100000) * 100;

  return (
    <div className="min-h-screen bg-[#03040b] text-white">
      {/* Search Bar Area */}
      <div className="bg-[#070913] border-b border-[#14172a] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <form onSubmit={handleSearch} className="flex items-center gap-4">
            <div className="relative flex-1 max-w-[620px]">
              <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                <Search className="size-4 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search for products, brands, creators..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-[#0f1123] border border-[#1e2243] text-white text-sm rounded-full py-3 pl-12 pr-12 placeholder:text-zinc-500 outline-none focus:border-violet-500 transition-all"
              />
              <button
                type="button"
                className="absolute right-14 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <Mic className="size-4" />
              </button>
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#4f46e5] size-9 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#4338ca] transition-colors"
              >
                <Search className="size-4 text-white" />
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <ShoppingBag className="size-4 text-zinc-400" />
                </div>
                <div className="text-xs">
                  <span className="text-zinc-500">Cart</span>
                </div>
              </div>
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Bell className="size-4 text-zinc-400" />
                </div>
                <span className="absolute -top-1 -right-1 bg-violet-600 text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">2</span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&q=80"
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover cursor-pointer"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Sub Navbar */}
      <div className="bg-[#070913] border-b border-[#14172a]">
        <div className="max-w-[1600px] mx-auto px-6 py-2 flex items-center gap-6 text-xs font-medium text-zinc-400">
          <button className="flex items-center gap-2 bg-[#1e1b4b] text-white px-3 py-1.5 rounded-md font-medium">
            <Menu className="size-3.5" /> All Categories <ChevronDown className="size-3" />
          </button>
          <span className="text-zinc-300 hover:text-white cursor-pointer transition-colors">For You</span>
          <span className="hover:text-white cursor-pointer transition-colors">Electronics</span>
          <span className="hover:text-white cursor-pointer transition-colors">Fashion</span>
          <span className="hover:text-white cursor-pointer transition-colors">Home & Living</span>
          <span className="hover:text-white cursor-pointer transition-colors">Beauty</span>
          <span className="hover:text-white cursor-pointer transition-colors">Sports</span>
          <span className="hover:text-white cursor-pointer transition-colors">Automotive</span>
          <span className="hover:text-white cursor-pointer transition-colors">Books</span>
          <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
            More <ChevronDown className="size-3" />
          </span>
          <div className="ml-auto flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-violet-400 cursor-pointer">
              <Percent className="size-3.5" /> Deals
            </span>
            <span className="flex items-center gap-1.5 cursor-pointer">
              <PackageCheck className="size-3.5" /> Track Order
            </span>
            <span className="flex items-center gap-1.5 text-violet-400 cursor-pointer">
              <Store className="size-3.5" /> Sell on Cartly
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 flex gap-6">
        {/* Left Sidebar Filters */}
        <aside className="w-[260px] shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold">Filters</h2>
            <button onClick={clearAllFilters} className="text-xs text-violet-500 hover:text-violet-400 cursor-pointer">
              Clear all
            </button>
          </div>

          {/* Category Section */}
          <div className="border-b border-[#14172a] pb-5 mb-5">
            <button 
              onClick={() => toggleSection("category")}
              className="flex items-center justify-between w-full mb-4 cursor-pointer"
            >
              <span className="text-sm font-semibold">Category</span>
              <ChevronUp className={cn("size-4 text-zinc-500 transition-transform", expandedSections.category && "rotate-180")} />
            </button>
            {expandedSections.category && (
              <ul className="space-y-3">
                {categoriesList.map((cat) => (
                  <li key={cat.name} className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(cat.name)}
                        onChange={() => handleCategoryToggle(cat.name)}
                        className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-violet-600 cursor-pointer"
                      />
                      <span className={cn(
                        "text-xs",
                        filters.categories.includes(cat.name) ? "text-indigo-300" : "text-zinc-400"
                      )}>
                        {cat.name}
                      </span>
                    </label>
                    <span className="text-[10px] text-zinc-600">({cat.count.toLocaleString()})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Brand Section */}
          <div className="border-b border-[#14172a] pb-5 mb-5">
            <button 
              onClick={() => toggleSection("brand")}
              className="flex items-center justify-between w-full mb-4 cursor-pointer"
            >
              <span className="text-sm font-semibold">Brand</span>
              <ChevronUp className={cn("size-4 text-zinc-500 transition-transform", expandedSections.brand && "rotate-180")} />
            </button>
            {expandedSections.brand && (
              <>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search brand"
                    className="w-full bg-[#0f1123] border border-[#1e2243] rounded-md py-2 px-3 text-xs text-white placeholder:text-zinc-500 outline-none"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3 text-zinc-500" />
                </div>
                <ul className="space-y-3">
                  {brandsList.map((brand) => (
                    <li key={brand.name} className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.brands.includes(brand.name)}
                          onChange={() => handleBrandToggle(brand.name)}
                          className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-violet-600 cursor-pointer"
                        />
                        <span className={cn(
                          "text-xs",
                          filters.brands.includes(brand.name) ? "text-indigo-300" : "text-zinc-400"
                        )}>
                          {brand.name}
                        </span>
                      </label>
                      <span className="text-[10px] text-zinc-600">({brand.count})</span>
                    </li>
                  ))}
                </ul>
                <button className="text-xs text-violet-500 hover:text-violet-400 mt-4 cursor-pointer">
                  + View more
                </button>
              </>
            )}
          </div>

          {/* Price Section */}
          <div className="pb-5">
            <button 
              onClick={() => toggleSection("price")}
              className="flex items-center justify-between w-full mb-4 cursor-pointer"
            >
              <span className="text-sm font-semibold">Price</span>
              <ChevronUp className={cn("size-4 text-zinc-500 transition-transform", expandedSections.price && "rotate-180")} />
            </button>
            {expandedSections.price && (
              <>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-[#0f1123] border border-[#1e2243] rounded-md py-2 px-2 text-xs text-zinc-500">
                    ₹ Min
                  </div>
                  <div className="flex-1 bg-[#0f1123] border border-[#1e2243] rounded-md py-2 px-2 text-xs text-zinc-500">
                    ₹ Max
                  </div>
                </div>
                <div className="relative h-1 bg-[#1e2243] rounded mb-6 mx-1">
                  <div 
                    className="absolute h-full bg-violet-600 rounded"
                    style={{ left: `${priceSliderLeft}%`, right: `${priceSliderRight}%` }}
                  />
                  <div 
                    className="absolute w-3 h-3 bg-white rounded-full -top-1 shadow"
                    style={{ left: `${priceSliderLeft}%`, transform: "translateX(-50%)" }}
                  />
                  <div 
                    className="absolute w-3 h-3 bg-white rounded-full -top-1 shadow"
                    style={{ right: `${priceSliderRight}%`, transform: "translateX(50%)" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Under ₹10,000", "₹10,000 - ₹20,000", "₹20,000 - ₹40,000", "Above ₹40,000"].map((pill) => (
                    <button
                      key={pill}
                      onClick={() => handlePricePillSelect(pill)}
                      className={cn(
                        "bg-[#0f1123] border border-[#1e2243] rounded-md py-2 text-[10px] text-zinc-500 cursor-pointer transition-all",
                        selectedPricePill === pill && "bg-[#1e1b4b] border-violet-600 text-white"
                      )}
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Right Content Area */}
        <section className="flex-1">
          {/* Search Title */}
          <h1 className="text-lg font-semibold mb-1">Search results for &ldquo;{query}&rdquo;</h1>
          <p className="text-xs text-zinc-500 mb-4">{products.length.toLocaleString()} products found</p>

          {/* Active Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {filters.categories.map(cat => (
              <span key={cat} className="flex items-center gap-2 bg-[#0f1425] border border-[#1e2243] px-3 py-1.5 rounded-md text-xs text-zinc-400">
                {cat} <X className="size-3 text-zinc-500 hover:text-white cursor-pointer" onClick={() => removeFilter("category")} />
              </span>
            ))}
            {filters.brands.length > 0 && (
              <span className="flex items-center gap-2 bg-[#0f1425] border border-[#1e2243] px-3 py-1.5 rounded-md text-xs text-zinc-400">
                Brand: {filters.brands.join(", ")} <X className="size-3 text-zinc-500 hover:text-white cursor-pointer" onClick={() => removeFilter("brand")} />
              </span>
            )}
            {selectedPricePill && (
              <span className="flex items-center gap-2 bg-[#0f1425] border border-[#1e2243] px-3 py-1.5 rounded-md text-xs text-zinc-400">
                Price: {selectedPricePill} <X className="size-3 text-zinc-500 hover:text-white cursor-pointer" onClick={() => removeFilter("price")} />
              </span>
            )}
            {filters.categories.length > 0 || filters.brands.length > 0 || selectedPricePill ? (
              <button onClick={clearAllFilters} className="text-xs text-violet-500 hover:text-violet-400 ml-2 cursor-pointer">
                Clear all
              </button>
            ) : null}
          </div>

          {/* Trust Banner */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { icon: Truck, title: "Fast Delivery", desc: "Get your order in 1-2 days" },
              { icon: Award, title: "Price Match", desc: "Best prices, guaranteed" },
              { icon: ShieldCheck, title: "Secure Payments", desc: "100% safe & secure" },
              { icon: RefreshCw, title: "Easy Returns", desc: "7 days return policy" },
            ].map((trust, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#090d1a] border border-[#14172a] rounded-lg p-3.5">
                <div className="text-violet-500">
                  <trust.icon className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold mb-0.5">{trust.title}</h4>
                  <p className="text-[10px] text-zinc-500">{trust.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sort and View Controls */}
          <div className="flex items-center justify-end gap-3 mb-5">
            <span className="text-xs text-zinc-500">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#090d1a] border border-[#14172a] px-3 py-2 rounded-md text-xs text-white cursor-pointer outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <div className="flex border border-[#14172a] rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-3 py-2 cursor-pointer transition-colors",
                  viewMode === "grid" ? "bg-[#1e2243] text-white" : "bg-[#090d1a] text-zinc-500"
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-2 cursor-pointer transition-colors",
                  viewMode === "list" ? "bg-[#1e2243] text-white" : "bg-[#090d1a] text-zinc-500"
                )}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="size-6 animate-spin text-indigo-400" />
              <span className="text-xs text-zinc-500">Searching products...</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
              <AlertTriangle className="size-8 text-rose-500" />
              <h3 className="text-sm font-bold text-white">Search failed</h3>
              <p className="text-xs text-zinc-550">Failed to connect to backend search service.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 select-none">
              <p className="text-sm font-bold text-zinc-400">No matching products found</p>
              <p className="text-xs text-zinc-550 mt-1">Try check spelling or use another keyword.</p>
            </div>
          ) : (
            <div className={cn(
              viewMode === "grid" 
                ? "grid grid-cols-4 gap-4" 
                : "flex flex-col gap-4"
            )}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
}

function ProductCard({ product, viewMode }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const discount = product.compareAtPrice && product.price 
    ? Math.round((1 - product.price / product.compareAtPrice) * 100) 
    : 0;

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };

  const handleAddToCart = async () => {
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsAdding(false);
  };

  if (viewMode === "list") {
    return (
      <div className="flex bg-[#090d1a] border border-[#14172a] rounded-xl p-4 gap-4">
        <div className="relative w-40 h-40 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-[#1e1b4b] text-[#818cf8] text-[10px] font-semibold px-2 py-0.5 rounded z-10">
              {discount}% OFF
            </span>
          )}
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <button
            onClick={handleWishlist}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full cursor-pointer"
          >
            <Heart className={cn("size-4", isWishlisted ? "fill-rose-500 text-rose-500" : "text-zinc-400")} />
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">{product.title}</h3>
            <p className="text-xs text-zinc-500 mb-2">{product.brand}</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                ★ {product.rating || 4.5} <span className="text-zinc-500 font-normal">(1.2K)</span>
              </span>
              <span className="flex items-center gap-1 bg-[#1e1b4b] text-violet-500 text-[10px] px-2 py-0.5 rounded font-medium">
                <Shield className="size-3" /> Assured
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{product.description}</p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">₹{product.price?.toLocaleString()}</span>
                {product.compareAtPrice && (
                  <span className="text-xs text-zinc-600 line-through">₹{product.compareAtPrice.toLocaleString()}</span>
                )}
              </div>
              <p className="text-xs text-emerald-500 mt-1">Upto ₹4,000 Off on Exchange</p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="px-4 py-2 bg-transparent border border-[#1f274a] text-[#818cf8] rounded-lg text-xs font-semibold hover:bg-[#1f274a] transition-all cursor-pointer disabled:opacity-50"
            >
              {isAdding ? <Loader2 className="size-4 animate-spin" /> : "ADD TO CART"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#090d1a] border border-[#14172a] rounded-xl p-4 relative group hover:border-zinc-700/50 transition-all">
      {discount > 0 && (
        <span className="absolute top-3 left-3 bg-[#1e1b4b] text-[#818cf8] text-[10px] font-semibold px-2 py-0.5 rounded z-10">
          {discount}% OFF
        </span>
      )}
      <button
        onClick={handleWishlist}
        className="absolute top-3 right-3 text-zinc-500 hover:text-white cursor-pointer z-10 transition-colors"
      >
        <Heart className={cn("size-5", isWishlisted ? "fill-rose-500 text-rose-500" : "text-zinc-500")} />
      </button>

      <div className="w-full h-[180px] flex items-center justify-center mb-4 bg-zinc-900/50 rounded-lg overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.title}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="flex justify-center gap-1 mb-3">
        {[1, 2, 3, 4].map((dot) => (
          <div
            key={dot}
            className={cn("w-1.5 h-1.5 rounded-full", dot === 1 ? "bg-zinc-400" : "bg-zinc-700")}
          />
        ))}
      </div>

      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-1">{product.title}</h3>
      <p className="text-[11px] text-zinc-500 mb-2">{product.brand}</p>

      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
          ★ {product.rating || 4.5} <span className="text-zinc-500 font-normal">({product.variants?.[0]?.inventoryQuantity || 124})</span>
        </span>
        <span className="flex items-center gap-1 bg-[#1e1b4b] text-violet-500 text-[10px] px-2 py-0.5 rounded font-medium">
          <Shield className="size-3" /> Assured
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-white">₹{product.price?.toLocaleString()}</span>
          {product.compareAtPrice && (
            <span className="text-xs text-zinc-600 line-through">₹{product.compareAtPrice.toLocaleString()}</span>
          )}
        </div>
        <p className="text-xs text-emerald-500 mt-1.5">Upto ₹{Math.round(product.price * 0.06).toLocaleString()} Off on Exchange</p>
        <p className="text-xs text-emerald-500">Bank Offer</p>
      </div>

      <button
        onClick={handleAddToCart}
        disabled={isAdding}
        className="w-full py-2.5 bg-transparent border border-[#1f274a] text-[#818cf8] rounded-lg text-xs font-semibold hover:bg-[#1f274a] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-auto"
      >
        {isAdding ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <ShoppingCart className="size-3.5" /> Add to Cart
          </>
        )}
      </button>
    </div>
  );
}