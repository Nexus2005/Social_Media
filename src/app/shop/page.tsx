"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Product, Category, Collection } from "@/features/shop/types";
import { CartlyAdapter } from "@/features/shop/adapters/cartlyAdapter";
import CartlyProductCard from "@/features/shop/components/CartlyProductCard";
import { 
  Sparkles, Brain, Users, RefreshCw, Clock, ArrowRight, 
  ShoppingBag, Shield, CheckCircle, Flame, ArrowRightLeft, Star, Heart, Tag
} from "lucide-react";
import { useCart } from "@/features/shop/contexts/CartContext";

const cartlyAdapter = new CartlyAdapter();

const slides = [
  {
    id: 1,
    imageUrl: "/1.png",
    linkUrl: "https://www.amazon.in/stores/page/ABA9E99C-FF6E-473E-9AAB-998B82236503/?_encoding=UTF8&store_ref=SB_A059309126OL6JW7XB9QC-A04032222OXX3I0YBANNM&pd_rd_plhdr=t&aaxitk=b25f8ddd39040099430b0abcdc00fa5e&hsa_cr_id=0&lp_asins=B08FZS992L%2CB0928PLNFF%2CB07M8S438V&lp_query=nike%20store&lp_slot=auto-sparkle-hsa-tetris&aref=jRvCVRGjLc&ref_=sbx_s_sparkle_sbtcd_hl&pd_rd_w=GnGW3&content-id=amzn1.sym.9269eab1-ae85-443b-9ec2-b2fa4ebaad05%3Aamzn1.sym.9269eab1-ae85-443b-9ec2-b2fa4ebaad05&pf_rd_p=9269eab1-ae85-443b-9ec2-b2fa4ebaad05&pf_rd_r=Z4Q3TKV0X71JGC75K04V&pd_rd_wg=tZvKp&pd_rd_r=94f69240-f100-453d-8edd-bfc5ed585982",
  },
  {
    id: 2,
    imageUrl: "/2.png",
    linkUrl: "https://www.amazon.in/stores/JBL/page/B17687EB-972F-4FED-AF3E-AD13D6BA2A89?lp_asin=B08FB396L1&ref_=ast_bln&store_ref=bl_ast_dp_brandlogo_sto",
  },
  {
    id: 3,
    imageUrl: "/3.png",
    linkUrl: "https://www.amazon.in/stores/Apple/page/88D59F86-9161-4804-A524-0A5B39CD714A?lp_asin=B0GQVL6STN&ref_=ast_bln",
  },
];

export default function ShopDiscoveryHome() {
  const router = useRouter();
  const { cart, addToCart, updateItemQty, removeItem } = useCart();
  
  // CMS & Section States
  const [sections, setSections] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [countdownText, setCountdownText] = useState("00h 00m 00s");

  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, []);

  // Autoplay timer
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [nextSlide]);

  // Load all CMS and e-commerce data
  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      // 1. Fetch CMS homepage layout structure
      const sectionsRes = await fetch("/api/shop/cms/sections");
      const sectionsData = await sectionsRes.json();
      setSections(sectionsData.sections || []);

      // 2. Fetch Banners
      const bannersRes = await fetch("/api/shop/banners");
      const bannersData = await bannersRes.json();
      setBanners(bannersData.banners || []);

      // 3. Fetch Flash Deals
      const dealsRes = await fetch("/api/shop/deals");
      const dealsData = await dealsRes.json();
      setDeals(dealsData.deals || []);

      // 4. Fetch Creator Picks
      const creatorsRes = await fetch("/api/shop/creators");
      const creatorsData = await creatorsRes.json();
      setCreators(creatorsData.picks || []);

      // 5. Fetch Traditional products catalog & categories
      const [prodList, catList] = await Promise.all([
        cartlyAdapter.getProducts({ limit: 40 }),
        cartlyAdapter.getCategories()
      ]);
      setCatalogProducts(prodList);
      setCategories(catList);

    } catch (e) {
      console.error("Failed to fetch shop discovery data:", e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Flash deals countdown timer ticking
  useEffect(() => {
    if (deals.length === 0) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const endAt = new Date(deals[0].endAt).getTime();
      const difference = endAt - now;

      if (difference <= 0) {
        setCountdownText("Offer Expired");
        clearInterval(interval);
      } else {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        const pad = (num: number) => String(num).padStart(2, "0");
        setCountdownText(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deals]);

  const handleAddToCart = async (productId: string, variantId: string) => {
    try {
      let cartId = localStorage.getItem("cartly_cart_id");
      if (!cartId) {
        const newCart = await cartlyAdapter.createCart();
        cartId = newCart.id;
        localStorage.setItem("cartly_cart_id", cartId!);
      }
      await addToCart(variantId, 1);
    } catch (err) {
      console.error("Error adding to cart", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-10 w-full animate-pulse py-6 select-none">
        <div className="h-60 w-full bg-zinc-900 rounded-[28px]" />
        <div className="h-10 w-full max-w-[650px] mx-auto bg-zinc-900 rounded-full" />
        <div className="flex flex-col gap-4">
          <div className="h-6 w-48 bg-zinc-900 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-zinc-900/60 rounded-2xl border border-zinc-850" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4 px-6">
        <Flame className="size-12 text-violet-500 animate-bounce" />
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">Marketplace temporarily offline</h2>
          <p className="text-xs text-zinc-550 max-w-sm mt-1.5 leading-normal">
            We are experiencing database connectivity issues. Ensure your server is active and try again!
          </p>
        </div>
        <button
          onClick={loadData}
          className="mt-2 px-5 py-2.5 bg-violet-650 hover:bg-violet-600 text-xs font-black text-white rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
        >
          <RefreshCw className="size-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // CMS SECTION RENDERERS
  // ----------------------------------------------------

  const renderHeroSection = () => {
    return (
      <section key="hero" className="relative w-full aspect-[3.4/1] overflow-hidden rounded-[20px] md:rounded-[24px] border border-black/10 dark:border-white/5 shadow-sm group mb-4 select-none">
        {/* Slides Container */}
        <div
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="w-full h-full flex-shrink-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.imageUrl}
                alt=""
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* Shop Button Overlay */}
              <div className="absolute right-[6.5%] bottom-2 z-10">
                <a href={slide.linkUrl} target="_blank" rel="noopener noreferrer">
                  <button className="banner-shop-btn">
                    <span>Shop Collection</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Click targets for Baked-in image arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-[2.5%] top-1/2 -translate-y-1/2 z-20 size-11 rounded-full cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 active:scale-90 transition-all flex items-center justify-center focus:outline-none"
          aria-label="Previous Slide"
        />

        <button
          onClick={nextSlide}
          className="absolute right-[2.5%] top-1/2 -translate-y-1/2 z-20 size-11 rounded-full cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 active:scale-90 transition-all flex items-center justify-center focus:outline-none"
          aria-label="Next Slide"
        />

        {/* Bottom dots indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 select-none">
          {slides.map((_, idx) => {
            const isActive = currentSlide === idx;
            return (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`size-2.5 rounded-full transition-all duration-300 ${
                  isActive ? "bg-white scale-110 shadow-sm" : "bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>
      </section>
    );
  };

  const renderFeatureStrip = () => {
    return (
      <section key="features" className="w-full mb-6 select-none">
        <div className="uiverse-feature-card">
          <div className="card-content grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 items-center w-full h-full">
            
            {/* Feature 1 */}
            <div className="flex items-center gap-3 text-left pl-2">
              <div className="p-2.5 rounded-xl bg-violet-950/40 text-violet-400 shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 15V9l5 3-5 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-white capitalize tracking-wider">AI Visual Finds</h4>
                <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">Scan details in video</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3 text-left border-l border-zinc-800/60 pl-4 md:pl-6">
              <div className="p-2.5 rounded-xl bg-violet-950/40 text-violet-400 shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-white capitalize tracking-wider">Compare Everywhere</h4>
                <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">Matches across stores</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3 text-left border-l border-zinc-800/60 pl-4 md:pl-6">
              <div className="p-2.5 rounded-xl bg-violet-950/40 text-violet-400 shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-white capitalize tracking-wider">Real-time Price Drops</h4>
                <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">Ticked notifications</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-center gap-3 text-left border-l border-zinc-800/60 pl-4 md:pl-6">
              <div className="p-2.5 rounded-xl bg-violet-950/40 text-violet-400 shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-white capitalize tracking-wider">Secure Checkouts</h4>
                <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">Protected payments</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    );
  };

  const renderCreatorPicks = () => {
    if (creators.length === 0) return null;

    const creatorPicksInfo: Record<string, { title: string; price: string; originalPrice: string; discount: string; glow: string; image: string }> = {
      techburner: {
        title: "Sony WH-1000XM5",
        price: "₹24,990",
        originalPrice: "₹29,990",
        discount: "17% OFF",
        glow: "rgba(99, 102, 241, 0.22)", // Indigo/blue
        image: "/electronics.avif"
      },
      beerbiceps: {
        title: "Optimum Nutrition Whey Protein",
        price: "₹4,499",
        originalPrice: "₹5,999",
        discount: "25% OFF",
        glow: "rgba(239, 68, 68, 0.22)", // Red
        image: "/on_whey.png"
      },
      komalpandeyofficial: {
        title: "Lancôme La Vie Est Belle",
        price: "₹6,890",
        originalPrice: "₹9,200",
        discount: "25% OFF",
        glow: "rgba(236, 72, 153, 0.22)", // Pink/magenta
        image: "/beauty.avif"
      },
      mrwhosetheboss: {
        title: "iPhone 15 (128GB)",
        price: "₹69,900",
        originalPrice: "₹79,900",
        discount: "13% OFF",
        glow: "rgba(6, 182, 212, 0.22)", // Cyan
        image: "/iphone15.png"
      },
      theformaledit: {
        title: "Casio Edifice Chronograph",
        price: "₹5,995",
        originalPrice: "₹8,495",
        discount: "29% OFF",
        glow: "rgba(244, 244, 245, 0.15)", // White/silver
        image: "/accessories.avif"
      },
      fit_tuber: {
        title: "Nike Air Zoom Pegasus 40",
        price: "₹8,495",
        originalPrice: "₹10,995",
        discount: "23% OFF",
        glow: "rgba(168, 85, 247, 0.22)", // Purple/violet
        image: "/footwear.avif"
      }
    };

    return (
      <section key="creators" className="mb-12 text-left select-none">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white capitalize font-nunito flex items-center gap-2">
              Creator Picks ✨
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Products handpicked by your favorite creators</p>
          </div>
          <button className="text-xs text-violet-400 font-bold hover:underline flex items-center gap-1 cursor-pointer">
            View all <span className="text-[14px] font-black">&gt;</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {creators.map((pick) => {
            const prod = pick.product;
            const creator = pick.creator;
            
            const meta = creatorPicksInfo[pick.creatorId] || {
              title: prod.title,
              price: `₹${Math.round(prod.price).toLocaleString("en-IN")}`,
              originalPrice: `₹${Math.round(prod.price * 1.25).toLocaleString("en-IN")}`,
              discount: pick.discountLabel || "20% OFF",
              glow: "rgba(139, 92, 246, 0.18)",
              image: prod.images?.[0] || prod.thumbnail
            };

            const lineItem = cart?.items?.find(item => item.productId === prod.id || item.variantId === prod.variants?.[0]?.id);
            const quantity = lineItem ? lineItem.quantity : 0;
            const lineItemId = lineItem ? lineItem.id : null;
            const variantId = prod.variants?.[0]?.id || "";

            const handleAdd = async (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (variantId) {
                await addToCart(variantId, 1);
              }
            };

            const handleIncrease = async (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (lineItemId) {
                await updateItemQty(lineItemId, quantity + 1);
              }
            };

            const handleDecrease = async (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (lineItemId) {
                if (quantity === 1) {
                  await removeItem(lineItemId);
                } else {
                  await updateItemQty(lineItemId, quantity - 1);
                }
              }
            };

            return (
              <div 
                key={pick.id} 
                className="group relative bg-zinc-900/30 border border-zinc-850 hover:border-violet-500/25 rounded-2xl overflow-hidden flex flex-col justify-between hover:bg-zinc-900/60 hover:shadow-xl hover:shadow-violet-950/5 active:scale-99 transition-all duration-300"
              >
                
                {/* Creator Avatar Header & Heart Button - padded inside the card */}
                <div className="flex items-center justify-between w-full p-3 pb-2.5 border-b border-zinc-800/40">
                  <div className="flex items-center gap-2 text-left">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={creator.avatar} 
                        alt={creator.name} 
                        className="size-7 rounded-full object-cover ring-1 ring-violet-500/20"
                      />
                      <span className="absolute bottom-0 right-0 size-2 bg-green-500 rounded-full border border-zinc-900" />
                    </div>
                    <div className="text-left leading-none">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-white hover:text-violet-400 transition-colors truncate max-w-[75px] block">{creator.name}</span>
                        <svg className="size-3 text-blue-500 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <span className="text-[8px] text-zinc-500 mt-0.5 block">{creator.followers}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-1 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-zinc-800/40 active:scale-90 transition-all duration-200"
                  >
                    <Heart className="size-3.5" />
                  </button>
                </div>

                {/* Full-bleed Product Image Showcase with radial back-glow */}
                <div 
                  onClick={() => router.push(`/shop/products/${prod.slug}`)}
                  className="aspect-square w-full bg-zinc-950/60 overflow-hidden relative flex items-center justify-center cursor-pointer border-b border-zinc-850/40"
                >
                  <div 
                    className="absolute inset-0 opacity-40 blur-xl pointer-events-none" 
                    style={{ backgroundImage: `radial-gradient(circle, ${meta.glow} 0%, transparent 70%)` }} 
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={meta.image || prod.images?.[0] || prod.thumbnail} 
                    alt={meta.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-10"
                  />
                </div>

                {/* Info and Purchase details - padded inside the card */}
                <div className="text-left flex-grow flex flex-col justify-between p-3 pt-2.5">
                  <div>
                    <h4 
                      onClick={() => router.push(`/shop/products/${prod.slug}`)}
                      className="text-xs font-black text-zinc-200 line-clamp-1 hover:text-white cursor-pointer transition-colors"
                    >
                      {meta.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between mt-3 gap-2">
                    <div className="flex flex-col text-left">
                      <div className="flex items-baseline gap-1.5 leading-none">
                        <span className="text-sm font-black text-amber-400">{meta.price}</span>
                        <span className="text-[10px] font-bold text-zinc-550 line-through">{meta.originalPrice}</span>
                      </div>
                      <span className="text-[8px] font-extrabold text-white bg-violet-600 px-1.5 py-0.5 rounded-[4px] w-fit mt-1 select-none shrink-0">
                        {meta.discount}
                      </span>
                    </div>

                    {quantity === 0 ? (
                      <button
                        onClick={handleAdd}
                        className="w-20 h-8 flex items-center justify-center border border-violet-500/70 hover:border-violet-500 bg-violet-950/10 hover:bg-violet-950/20 text-violet-400 font-bold text-xs rounded-[6px] transition-all duration-150 active:scale-95 select-none shrink-0"
                      >
                        ADD
                      </button>
                    ) : (
                      <div 
                        className="w-20 h-8 flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs rounded-[6px] overflow-hidden select-none border border-violet-500/20 shrink-0"
                      >
                        <button 
                          onClick={handleDecrease}
                          className="w-6.5 h-full flex items-center justify-center hover:bg-white/10 active:scale-90 text-sm"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-black text-xs select-none">
                          {quantity}
                        </span>
                        <button 
                          onClick={handleIncrease}
                          className="w-6.5 h-full flex items-center justify-center hover:bg-white/10 active:scale-90 text-sm"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderDealsSection = () => {
    if (deals.length === 0) return null;
    return (
      <section id="deals" key="deals" className="mb-12 text-left bg-gradient-to-br from-zinc-900/60 to-zinc-950 border border-zinc-850 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent opacity-60 pointer-events-none" />
        
        {/* Deal Header with Ticking Timer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Flame className="size-5.5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white capitalize font-nunito tracking-wide">Deals of the Day</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Top flash deals with high-percentage savings. Grab before sold out!</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
            <Clock className="size-4 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-500 capitalize tracking-widest">Ending in:</span>
            <span className="text-xs font-mono font-black text-amber-400 tracking-wider bg-zinc-950 px-2 py-0.5 rounded-md">{countdownText}</span>
          </div>
        </div>

        {/* Deals list horizontal scroll */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {deals.slice(0, 3).map((deal) => {
            const prod = deal.product;
            const savings = Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100);
            const percentSold = Math.round((deal.soldCount / deal.totalCount) * 100);

            const lineItem = cart?.items?.find(item => item.productId === prod.id || item.variantId === prod.variants?.[0]?.id);
            const quantity = lineItem ? lineItem.quantity : 0;
            const lineItemId = lineItem ? lineItem.id : null;
            const variantId = prod.variants?.[0]?.id || "";

            const handleAdd = async (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (variantId) {
                await addToCart(variantId, 1);
              }
            };

            const handleIncrease = async (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (lineItemId) {
                await updateItemQty(lineItemId, quantity + 1);
              }
            };

            const handleDecrease = async (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (lineItemId) {
                if (quantity === 1) {
                  await removeItem(lineItemId);
                } else {
                  await updateItemQty(lineItemId, quantity - 1);
                }
              }
            };

            return (
              <div 
                key={deal.id} 
                className="bg-zinc-950/60 border border-zinc-850/80 hover:border-zinc-700/80 rounded-2xl p-4 flex gap-4 hover:shadow-xl hover:bg-zinc-950 transition-all duration-300"
              >
                
                {/* Product Thumbnail */}
                <div 
                  onClick={() => router.push(`/shop/products/${prod.slug}`)}
                  className="size-24 bg-zinc-900 rounded-xl overflow-hidden shrink-0 cursor-pointer relative"
                >
                  <img 
                    src={prod.images?.[0] || prod.thumbnail} 
                    alt={prod.title} 
                    className="w-full h-full object-contain p-2"
                  />
                  <span className="absolute -top-1 -left-1 bg-amber-500 text-[8px] font-black text-zinc-950 px-2 py-0.5 rounded-[4px] font-nunito shadow-sm">
                    {savings}% OFF
                  </span>
                </div>

                {/* Deal Metrics and Add to Cart */}
                <div className="flex-grow flex flex-col justify-between text-left leading-normal">
                  <div>
                    <h4 
                      onClick={() => router.push(`/shop/products/${prod.slug}`)}
                      className="text-xs font-bold text-zinc-200 line-clamp-1 hover:text-white cursor-pointer transition-colors"
                    >
                      {prod.title}
                    </h4>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm font-black text-white">₹{Math.round(deal.dealPrice).toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-zinc-550 line-through">₹{Math.round(deal.originalPrice).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[8.5px] font-bold text-zinc-500 mb-1">
                      <span>{percentSold}% Claimed</span>
                      <span>{deal.soldCount.toLocaleString()}/{deal.totalCount.toLocaleString()} Sold</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full" 
                        style={{ width: `${percentSold}%` }}
                      />
                    </div>
                  </div>

                  {quantity === 0 ? (
                    <button 
                      onClick={handleAdd}
                      className="mt-3 w-full h-8 flex items-center justify-center border border-violet-500/70 hover:border-violet-500 bg-violet-950/10 hover:bg-violet-950/20 text-violet-400 font-bold text-xs rounded-lg transition-all duration-150 active:scale-97 select-none"
                    >
                      ADD
                    </button>
                  ) : (
                    <div 
                      className="mt-3 w-full h-8 flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs rounded-lg overflow-hidden select-none border border-violet-500/20"
                    >
                      <button 
                        onClick={handleDecrease}
                        className="w-10 h-full flex items-center justify-center hover:bg-white/10 active:scale-90 text-sm"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-black text-xs select-none">
                        {quantity}
                      </span>
                      <button 
                        onClick={handleIncrease}
                        className="w-10 h-full flex items-center justify-center hover:bg-white/10 active:scale-90 text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCategoriesGrid = () => {
    const categoriesList = [
      { name: "Electronics", slug: "electronics", image: "/electronics.avif" },
      { name: "Fashion", slug: "fashion", image: "/fashion.avif" },
      { name: "Footwear", slug: "footwear", image: "/footwear.avif" },
      { name: "Home & Living", slug: "home-living", image: "/home.avif" },
      { name: "Beauty", slug: "beauty", image: "/beauty.avif" },
      { name: "Sports", slug: "sports", image: "/sports.avif" },
      { name: "Automotive", slug: "automotive", image: "/automotive.avif" },
      { name: "Books", slug: "books", image: "/books.avif" },
      { name: "Accessories", slug: "accessories", image: "/accessories.avif" },
      {
        name: "More",
        slug: "",
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-violet-400 group-hover:scale-105 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        )
      }
    ];

    return (
      <section key="categories" className="mb-12 text-left select-none">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black tracking-tight text-white capitalize font-nunito">
            Shop by Category
          </h2>
          <button className="text-xs text-violet-400 font-bold hover:underline flex items-center gap-1 cursor-pointer">
            View all categories <span className="text-[14px] font-black">&gt;</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-4">
          {categoriesList.map((cat, i) => (
            <div 
              key={i}
              onClick={() => router.push(cat.slug ? `/shop/categories/${cat.slug}` : "/shop/categories")}
              className="group bg-zinc-900/30 border border-zinc-850 hover:border-violet-500/30 rounded-[18px] p-3 flex flex-col items-center justify-between hover:bg-zinc-900/60 hover:shadow-xl hover:shadow-violet-950/5 active:scale-98 transition-all duration-300 cursor-pointer h-[154px]"
            >
              <div className="w-full aspect-square bg-zinc-950/40 rounded-xl overflow-hidden flex items-center justify-center relative border border-zinc-850/40 group-hover:border-violet-500/10">
                {cat.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex items-center justify-center text-violet-400">
                    {cat.icon}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-zinc-300 mt-2 truncate w-full text-center group-hover:text-white transition-colors">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderProductGrid = () => {
    return (
      <section key="catalog" className="text-left">
        <h2 className="text-lg font-black tracking-tight text-white capitalize font-nunito flex items-center gap-2 mb-6">
          <ShoppingBag className="size-5 text-violet-400" />
          Marketplace Catalog
        </h2>
        {catalogProducts.length === 0 ? (
          <p className="text-xs text-zinc-550 italic">No products found in the catalog.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {catalogProducts.map((prod) => (
              <CartlyProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </section>
    );
  };

  // ----------------------------------------------------
  // DYNAMIC SECTION PARSER
  // ----------------------------------------------------
  return (
    <div className="flex flex-col">
      {sections.map((sec) => {
        if (!sec.visible) return null;
        switch (sec.type) {
          case "HERO":
            return renderHeroSection();
          case "FEATURE_STRIP":
            return renderFeatureStrip();
          case "CATEGORIES":
            return renderCategoriesGrid();
          case "CREATOR_PICKS":
            return renderCreatorPicks();
          case "DEALS":
            return renderDealsSection();
          case "PRODUCT_GRID":
            return renderProductGrid();
          default:
            return null;
        }
      })}
    </div>
  );
}
