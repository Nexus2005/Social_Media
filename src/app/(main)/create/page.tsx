"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PostEditor from "@/components/posts/editor/PostEditor";

export default function CreatePage() {
  const router = useRouter();

  useEffect(() => {
    // Add page-specific class to override layout paddings
    document.body.classList.add("route-create-active");
    return () => {
      document.body.classList.remove("route-create-active");
    };
  }, []);

  const handleClose = () => {
    router.back();
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-start sm:items-center justify-center p-0 sm:p-4 md:p-8">
      {/* Inject styling overrides to remove layout sidebars/padding constraints */}
      <style jsx global>{`
        .route-create-active .main-content-wrapper {
          padding-left: 0 !important;
          padding-bottom: 0 !important;
        }
      `}</style>
      
      <div className="w-full sm:max-w-[680px] h-full sm:h-auto min-h-screen sm:min-h-0 bg-black flex flex-col justify-start">
        <PostEditor onClose={handleClose} />
      </div>
    </div>
  );
}
