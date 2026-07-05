"use client";

import { useState, useEffect, useCallback } from "react";

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

export default function HomeBanners() {
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

  return (
    <div className="relative w-full aspect-[2.65/1] overflow-hidden rounded-[20px] md:rounded-[24px] border border-black/10 dark:border-white/5 shadow-sm group">
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

      {/* Invisible Click Target overlays on top of the baked-in image arrows */}
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
    </div>
  );
}
