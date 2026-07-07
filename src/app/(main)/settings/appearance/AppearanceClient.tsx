"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, Laptop, Check } from "lucide-react";
import { useEffect, useState } from "react";

export default function AppearanceClient() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting until mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const themeOptions = [
    {
      id: "light",
      label: "Classic Light",
      desc: "Clean white background with dark typography.",
      icon: Sun,
    },
    {
      id: "rose-cloud",
      label: "Rose Cloud",
      desc: "Soft rose cloud background with berry rose text.",
      icon: Sun,
    },
    {
      id: "morning-mist",
      label: "Morning Mist",
      desc: "Cool slate blue mist background with dark slate text.",
      icon: Sun,
    },
    {
      id: "twilight-haze",
      label: "Twilight Haze",
      desc: "Cozy twilight haze background with dark indigo text.",
      icon: Sun,
    },
    {
      id: "sage-dew",
      label: "Sage Dew",
      desc: "Fresh sage background with dark olive green text.",
      icon: Sun,
    },
    {
      id: "peach-whisper",
      label: "Peach Whisper",
      desc: "Warm peach background with dark terracotta text.",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      desc: "Pure black surface designed to minimize eye strain.",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Default",
      desc: "Automatically syncs with your device settings.",
      icon: Laptop,
    },
  ];

  if (!mounted) {
    return (
      <div className="w-full max-w-[600px] mx-auto min-h-screen bg-background text-foreground pb-12 select-none">
        <header className="sticky top-0 z-30 flex items-center gap-4 h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-secondary rounded-full text-foreground transition-colors border-0"
            title="Back"
          >
            <ArrowLeft className="size-6" strokeWidth={2} />
          </button>
          <h1 className="text-[20px] font-bold tracking-tight">Appearance</h1>
        </header>
        <div className="p-4 flex justify-center py-12">
          <div className="size-6 border-2 border-t-transparent border-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[600px] mx-auto min-h-screen bg-background text-foreground pb-12">
      {/* Page Header */}
      <header className="sticky top-0 z-30 flex items-center gap-4 h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border select-none">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-secondary rounded-full text-foreground transition-colors border-0"
          title="Back"
          id="btn-appearance-back"
        >
          <ArrowLeft className="size-6" strokeWidth={2} />
        </button>
        <h1 id="appearance-heading" className="text-[20px] font-bold tracking-tight">Appearance</h1>
      </header>

      <div className="p-4 space-y-6">
        <div className="space-y-1 select-none">
          <h2 className="text-[15px] font-semibold">Choose how Cartly looks</h2>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Select a theme to customize your workspace appearance. Changes take effect instantly.
          </p>
        </div>

        {/* Theme Options list */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border select-none">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.id;

            return (
              <button
                key={opt.id}
                id={`btn-theme-${opt.id}`}
                onClick={() => setTheme(opt.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/40 active:bg-secondary/60 transition-colors text-left border-0 group"
              >
                <div className="flex gap-4 items-start">
                  <div className="p-2 bg-secondary rounded-xl text-foreground group-hover:scale-105 transition-transform">
                    <Icon className="size-5" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] font-semibold leading-none mb-1 text-foreground">
                      {opt.label}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {opt.desc}
                    </span>
                  </div>
                </div>

                {/* Radio Circle Selector */}
                <div className="flex items-center justify-center shrink-0">
                  <div
                    className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isActive
                        ? "border-primary bg-primary"
                        : "border-zinc-500 hover:border-zinc-400"
                    }`}
                  >
                    {isActive && <Check className="size-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Theme info box */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 text-[13px] text-muted-foreground select-none">
          Currently rendering with <span className="font-semibold text-foreground">{resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}</span> theme.
        </div>
      </div>
    </div>
  );
}
