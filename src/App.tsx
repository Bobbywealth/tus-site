import { useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  type: string;
  price: number;
  imageUrl: string;
  gallery?: string[];
  description: string;
  options: string[];
};

type CartItem = {
  cartKey: string;
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  option: string;
  quantity: number;
};

export default function TUSLandingPreview() {
  const footballFieldUrl = "https://i.imgur.com/1vmkRhY.jpeg";
  const logoUrl = "https://i.imgur.com/9rOZpZv.jpeg";
  const heatherImageUrl = "https://i.imgur.com/ShWQDtQ.jpeg";
  const hatImageUrl = "https://i.imgur.com/0slScEh.jpeg";
  const hoodieImageUrl = "https://i.imgur.com/TFnt0Qc.jpeg";
  const mugImageUrl = "https://i.imgur.com/8zIcPN9.jpeg";
  const cropTopImageUrl = "https://i.imgur.com/w7kHXGd.jpeg";
  const signatureShirtImageUrl = "https://i.imgur.com/M0433sd.jpeg";
  const heatherCropTopImageUrl = "https://i.imgur.com/VjeHeOS.jpeg";

  const videos = [
    {
      title: "Most Recent Episode",
      time: "Watch Now",
      sport: "Latest Episode",
      youtubeUrl: "https://www.youtube.com/watch?v=X2Ukw40LMTI",
      thumbnailUrl: "https://img.youtube.com/vi/X2Ukw40LMTI/maxresdefault.jpg",
    },
    {
      title: "Featured Athlete Interview",
      time: "Watch Now",
      sport: "Sports Interview",
      youtubeUrl: "https://www.youtube.com/watch?v=vJ4UBKezT-0",
      thumbnailUrl: "https://img.youtube.com/vi/vJ4UBKezT-0/maxresdefault.jpg",
    },
    {
      title: "Exclusive Athlete Conversation",
      time: "Watch Now",
      sport: "Featured Episode",
      youtubeUrl: "https://www.youtube.com/watch?v=F0SZSzeh2QA",
      thumbnailUrl: "https://img.youtube.com/vi/F0SZSzeh2QA/maxresdefault.jpg",
    },
  ];

  const merch: Product[] = [
    {
      id: "tus-tee",
      name: "TUS Signature T-Shirt",
      type: "Apparel",
      price: 25,
      imageUrl: signatureShirtImageUrl,
      description: "Premium TUS logo tee for fans, athletes, and supporters.",
      options: ["S", "M", "L", "XL", "2XL"],
    },
    {
      id: "tus-hat",
      name: "TUS Dad Hat",
      type: "Headwear",
      price: 19.99,
      imageUrl: hatImageUrl,
      description: "Classic everyday dad hat with the TUS sports-media logo.",
      options: ["One Size"],
    },
    {
      id: "tus-hoodie",
      name: "TUS Premium Hoodie",
      type: "Apparel",
      price: 44.99,
      imageUrl: hoodieImageUrl,
      description: "Heavyweight hoodie built for game day, interviews, and streetwear.",
      options: ["S", "M", "L", "XL", "2XL"],
    },
    {
      id: "tus-mug",
      name: "TUS Coffee Mug",
      type: "Accessories",
      price: 12,
      imageUrl: mugImageUrl,
      description: "Official TUS mug for coffee, tea, and podcast mornings.",
      options: ["11 oz"],
    },
    {
      id: "tus-crop-top",
      name: "TUS Crop Top",
      type: "Women's Apparel",
      price: 25,
      imageUrl: cropTopImageUrl,
      description: "Premium fitted crop top featuring the official TUS branding.",
      gallery: [cropTopImageUrl, heatherCropTopImageUrl],
      options: ["XS", "S", "M", "L"],
    },
  ];

  const stats = [
    { value: "ATHLETE", label: "STORIES" },
    { value: "REAL", label: "CONVERSATIONS" },
    { value: "UNTOLD", label: "JOURNEYS" },
  ];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeProductImages, setActiveProductImages] = useState<Record<string, string>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);
    setCheckoutError(null);

    const apiUrl = (import.meta as any).env?.VITE_API_URL || "https://tus-api.onrender.com";

    try {
      const res = await fetch(`${apiUrl}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.id,
            option: item.option,
            quantity: item.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Checkout failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setCheckoutError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const addToCart = (product: Product) => {
    const selectedOption = selectedOptions[product.id] || product.options[0];
    const cartKey = `${product.id}-${selectedOption}`;

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.cartKey === cartKey);

      if (existingItem) {
        return currentCart.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...currentCart,
        {
          cartKey,
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          option: selectedOption,
          quantity: 1,
        },
      ];
    });
  };

  const updateCartQuantity = (cartKey: string, quantity: number) => {
    setCart((currentCart) => {
      if (quantity <= 0) {
        return currentCart.filter((item) => item.cartKey !== cartKey);
      }

      return currentCart.map((item) =>
        item.cartKey === cartKey ? { ...item, quantity } : item
      );
    });
  };

  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );

  const cartItemCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  return (
    <div className="min-h-screen scroll-smooth bg-[#0a0a0a] font-sans text-white">
      <style>{`
        @keyframes tusIntroFadeUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes tusLightSweep {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          35% { opacity: 0.65; }
          100% { transform: translateX(140%) skewX(-18deg); opacity: 0; }
        }

        @keyframes tusPulseGlow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.08); }
        }

        @keyframes tusSlideLine {
          0% { width: 0; opacity: 0; }
          100% { width: 100%; opacity: 1; }
        }

        .tus-intro-fade { animation: tusIntroFadeUp 900ms ease-out both; }
        .tus-intro-delay-1 { animation-delay: 160ms; }
        .tus-intro-delay-2 { animation-delay: 320ms; }
        .tus-intro-delay-3 { animation-delay: 480ms; }
        .tus-glow-pulse { animation: tusPulseGlow 3.4s ease-in-out infinite; }
        .tus-line-reveal { animation: tusSlideLine 1.1s ease-out 700ms both; }
        .tus-light-sweep { animation: tusLightSweep 3.6s ease-in-out 1.1s infinite; }

        @media (prefers-reduced-motion: reduce) {
          .tus-intro-fade,
          .tus-glow-pulse,
          .tus-line-reveal,
          .tus-light-sweep {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-red-700/30 bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/70 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:justify-center sm:gap-8 sm:px-6 sm:py-4">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 text-zinc-300 transition hover:border-red-500 hover:text-red-400 md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop nav left */}
          <nav className="hidden items-center gap-5 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 lg:flex">
            <a href="#home" className="transition hover:text-red-500">Home</a>
            <a href="#host" className="transition hover:text-red-500">Host</a>
            <a href="#videos" className="transition hover:text-red-500">Videos</a>
          </nav>

          <a href="#home" aria-label="The Untold Season home" className="shrink-0">
            <img
              src={logoUrl}
              alt="TUS Logo"
              className="h-36 w-36 object-contain drop-shadow-[0_0_25px_rgba(220,38,38,0.45)] sm:h-28 sm:w-28 md:h-32 md:w-32"
            />
          </a>

          {/* Desktop nav right */}
          <nav className="hidden items-center gap-5 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 lg:flex">
            <a href="#episodes" className="transition hover:text-red-500">Episodes</a>
            <a href="#store" className="transition hover:text-red-500">Shop</a>
            <a href="#contact" className="transition hover:text-red-500">Contact</a>
          </nav>

          {/* Mobile cart button */}
          <a
            href="#store"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-700/60 text-xs font-bold uppercase tracking-[0.2em] text-zinc-200 transition hover:border-red-500 hover:text-red-400 md:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartItemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black">{cartItemCount}</span>
            )}
          </a>
        </div>

        {/* Mobile Menu */}
        <div className={`overflow-hidden transition-all duration-300 md:hidden ${isMobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <nav className="flex flex-col gap-1 border-t border-zinc-800 bg-black/95 px-4 py-4 backdrop-blur-xl">
            <a href="#home" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-zinc-800 hover:text-red-500">Home</a>
            <a href="#host" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-zinc-800 hover:text-red-500">Host</a>
            <a href="#videos" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-zinc-800 hover:text-red-500">Videos</a>
            <a href="#episodes" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-zinc-800 hover:text-red-500">Episodes</a>
            <a href="#store" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-zinc-800 hover:text-red-500">Shop</a>
            <a href="#contact" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-zinc-800 hover:text-red-500">Contact</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative flex min-h-[85vh] sm:min-h-[720px] items-center overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0.95)),repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_120px),linear-gradient(135deg,#111827,#020617_45%,#450a0a)]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: `url(${footballFieldUrl})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25),rgba(0,0,0,0.78))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.2),transparent_42%)]" />
        <div className="tus-glow-pulse absolute left-1/2 top-20 sm:top-24 h-56 sm:h-72 w-56 sm:w-72 -translate-x-1/2 rounded-full bg-red-600/20 blur-3xl" />
        <div className="tus-light-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 bg-gradient-to-t from-black to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 lg:py-36 text-center">
          <div className="tus-line-reveal mx-auto mb-6 sm:mb-8 h-px max-w-xs sm:max-w-xl bg-gradient-to-r from-transparent via-red-600 to-transparent" />

          <div className="tus-intro-fade tus-intro-delay-1 mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-red-700/40 bg-black/40 px-4 sm:px-4 py-2 sm:py-2 text-sm sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-zinc-300">
            Sports Podcast • Athlete Interviews • Untold Stories
          </div>

          <h1 className="tus-intro-fade tus-intro-delay-2 mx-auto max-w-5xl text-5xl sm:text-4xl md:text-5xl lg:text-7xl font-black uppercase leading-[1.05] sm:leading-none tracking-tight">
            Real Stories.
            <br />
            Real Athletes.
            <br />
            <span className="text-red-600">Untold Legacies.</span>
          </h1>

          <p className="tus-intro-fade tus-intro-delay-3 mx-auto mt-6 sm:mt-8 max-w-2xl text-xl sm:text-lg leading-relaxed text-zinc-300 px-2">
            Interviews with athletes from high school standouts to professional stars across football, basketball, boxing, and beyond.
          </p>

          <div className="tus-intro-fade tus-intro-delay-3 mt-10 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
            <a
              href="#store"
              className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-black/60 px-8 py-4 sm:py-4 text-sm sm:text-sm font-bold uppercase tracking-wide text-white shadow-2xl shadow-black/40 transition hover:border-white hover:bg-zinc-900 active:scale-[0.98] active:bg-zinc-800"
            >
              Shop Now
            </a>

            <a
              href="#videos"
              className="w-full sm:w-auto rounded-xl bg-red-600 px-8 py-4 sm:py-4 text-sm sm:text-sm font-bold uppercase tracking-wide text-white shadow-xl shadow-red-900/40 transition hover:bg-red-500 active:scale-[0.98] active:bg-red-700"
            >
              WATCH VIDEOS
            </a>
          </div>
        </div>
      </section>

      {/* HOST */}
      <section id="host" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        {/* Mobile: Stacked single column | Desktop: 2-column grid */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Column 1: Label + Heading + Image (mobile stacked, desktop left) */}
          <div>
            <p className="mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-500">Meet The Host</p>
            <h2 className="mb-6 sm:mb-8 text-3xl sm:text-4xl md:text-5xl font-black uppercase leading-tight">Heather Gabrielle</h2>
            
            {/* Heather Image */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-red-700/20 blur-3xl" />
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-zinc-800 bg-black shadow-2xl shadow-red-950/30">
                <img src={heatherImageUrl} alt="Heather Gabrielle" className="absolute inset-0 h-full w-full object-cover object-top" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.88))]" />
                <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-10">
                  <div className="mb-3 sm:mb-5 inline-flex items-center gap-2 rounded-full border border-red-600/50 bg-black/50 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-zinc-200 backdrop-blur">
                    Host • Sports Media • Interviews
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase leading-none drop-shadow-2xl">Heather Gabrielle</h3>
                  <p className="mt-3 sm:mt-4 max-w-md text-sm sm:text-base leading-relaxed text-zinc-300">
                    Bringing real athlete stories and untold journeys to the spotlight through authentic sports conversations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Bio + Stats (mobile stacked below, desktop right) */}
          <div className="lg:pl-4">
            <p className="text-base sm:text-lg leading-relaxed text-zinc-300">
              "Hey, I'm Heather Gabrielle, host of The Untold Season Podcast. I created this platform to go beyond the athlete label and uncover the real stories behind the people we cheer for every day.
              <br /><br />
              Behind every highlight and headline is a journey most people never hear about — the sacrifices, setbacks, pressure, discipline, and defining moments that shaped them long before the spotlight.
              <br /><br />
              The Untold Season is more than a sports podcast. It's a space where athletes can speak openly about life, resilience, purpose, and legacy — not just as competitors, but as people.
              <br /><br />
              Every athlete has a story. Every season has a chapter nobody talks about. And here, we tell the untold season."
            </p>

            <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-3 sm:gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 sm:p-5 text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-red-500">{stat.value}</div>
                  <div className="mt-1 text-[10px] sm:text-xs md:text-sm uppercase text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EPISODES CTA */}
      <section id="episodes" className="border-y border-zinc-800 bg-black">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 py-12 sm:py-16 lg:grid-cols-[1.3fr_0.7fr] lg:items-center lg:gap-10">
          <div>
            <p className="mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-500">New Episodes</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase leading-tight lg:text-5xl">Built for athletes at every level.</h2>
            <p className="mt-4 sm:mt-5 max-w-3xl text-base sm:text-lg leading-relaxed text-zinc-300">
              The platform highlights stories from high school, college, and professional athletes across football, basketball, boxing, and more.
            </p>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-red-700/40 bg-zinc-950 p-6 sm:p-8 text-center shadow-2xl shadow-red-950/20">
            <img src={logoUrl} alt="TUS Badge" className="mx-auto mb-4 sm:mb-5 h-20 sm:h-28 w-20 sm:w-28 object-contain" />
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-zinc-400">Watch • Listen • Subscribe</p>
          </div>
        </div>
      </section>

      {/* VIDEOS */}
      <section id="videos" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-20">
        <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="mb-1 sm:mb-2 text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-500">Featured Content</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase">Latest Videos</h2>
          </div>

          <a
            href="https://www.youtube.com/@theuntoldseason"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-700 px-4 sm:px-5 py-2 text-xs sm:text-sm uppercase tracking-widest transition hover:border-red-500"
          >
            View All
          </a>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {videos.map((video) => (
            <a
              key={video.title}
              href={video.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-900 transition-all hover:-translate-y-1 hover:border-red-700 hover:shadow-2xl hover:shadow-red-950/30"
            >
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-800 via-black to-red-950">
                <img src={video.thumbnailUrl} alt={video.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.75))]" />
                <div className="absolute left-3 sm:left-4 top-3 sm:top-4 flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-full border border-red-600 bg-black/70 text-xs sm:text-sm font-black">TUS</div>
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 rounded-full border border-zinc-700 bg-black/80 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-300">{video.sport}</div>
                <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 rounded bg-black/80 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold">{video.time}</div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mb-3 sm:mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-red-700/40 bg-red-950/30 px-2 sm:px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
                    YouTube
                  </span>

                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 transition group-hover:text-red-400">
                    Click To Watch →
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold leading-snug transition group-hover:text-red-400">{video.title}</h3>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-400">Exclusive athlete interview and untold sports stories.</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* FULL SHOP PAGE */}
      <section id="store" className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-24">
          <div className="mb-8 sm:mb-14 flex flex-col justify-between gap-4 sm:gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-500">Official Store</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase">TUS Merchandise</h2>
              <p className="mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base text-zinc-400">
                Shop the official TUS collection. The cart is functional now and the checkout button is ready to connect to Stripe later.
              </p>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-red-700/40 bg-black px-4 sm:px-6 py-3 sm:py-4 text-right shadow-xl shadow-red-950/20">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Cart</p>
              <p className="mt-1 text-xl sm:text-2xl font-black text-white">{cartItemCount} Items</p>
            </div>
          </div>

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-4 sm:gap-6 xs:grid-cols-1 sm:grid-cols-2">
              {merch.map((item) => (
                <article key={item.id} className="group overflow-hidden rounded-2xl sm:rounded-[2rem] border border-zinc-800 bg-black transition hover:-translate-y-1 hover:border-red-700 hover:shadow-2xl hover:shadow-red-950/30">
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-black to-zinc-800">
                    <div className="absolute left-3 sm:left-4 top-3 sm:top-4 rounded-full border border-red-700/50 bg-black/70 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-300">{item.type}</div>
                    <img
                      src={activeProductImages[item.id] || item.imageUrl}
                      alt={`${item.name} preview`}
                      className="h-full w-full object-contain p-3 sm:p-5 transition duration-500 group-hover:scale-105"
                    />

                    {item.gallery && item.gallery.length > 1 && (
                      <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 flex justify-center gap-2 sm:gap-3 rounded-full border border-zinc-700 bg-black/80 px-2 sm:px-3 py-1.5 sm:py-2 backdrop-blur">
                        {item.gallery.map((galleryImage, index) => (
                          <button
                            key={`${item.id}-${index}`}
                            type="button"
                            onClick={() =>
                              setActiveProductImages((currentImages) => ({
                                ...currentImages,
                                [item.id]: galleryImage,
                              }))
                            }
                            className={`h-10 sm:h-12 w-10 sm:w-12 overflow-hidden rounded-full border transition ${
                              (activeProductImages[item.id] || item.imageUrl) === galleryImage
                                ? "border-red-500"
                                : "border-zinc-700 hover:border-red-500"
                            }`}
                            aria-label={`View ${item.name} image ${index + 1}`}
                          >
                            <img src={galleryImage} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-xl font-black uppercase leading-tight">{item.name}</h3>
                        <p className="mt-1 sm:mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400">{item.description}</p>
                      </div>
                      <p className="shrink-0 text-lg sm:text-xl font-black text-red-500">${item.price.toFixed(2)}</p>
                    </div>

                    <div className="mt-4 sm:mt-5 grid gap-2 sm:gap-3">
                      <select
                        value={selectedOptions[item.id] || item.options[0]}
                        onChange={(event) =>
                          setSelectedOptions((currentOptions) => ({
                            ...currentOptions,
                            [item.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-white outline-none transition focus:border-red-600"
                      >
                        {item.options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="w-full rounded-xl bg-red-600 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-500 active:scale-[0.98]"
                      >
                        Add To Cart
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="hidden lg:block h-fit rounded-[2rem] border border-zinc-800 bg-black p-6 shadow-2xl shadow-red-950/20 lg:sticky lg:top-40">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-red-500">Checkout Preview</p>
                  <h3 className="mt-1 text-2xl font-black uppercase">Your Cart</h3>
                </div>
                <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-bold uppercase tracking-widest text-zinc-400">Demo</span>
              </div>

              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-6 text-center">
                  <img src={logoUrl} alt="TUS Logo" className="mx-auto mb-4 h-16 w-16 object-contain opacity-70" />
                  <p className="text-sm leading-relaxed text-zinc-400">Your cart is empty. Add merch to preview the store flow.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.cartKey} className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-xl bg-black object-contain p-1" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black uppercase">{item.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{item.option}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center overflow-hidden rounded-lg border border-zinc-800">
                            <button type="button" onClick={() => updateCartQuantity(item.cartKey, item.quantity - 1)} className="px-3 py-1 text-zinc-300 transition hover:bg-red-600 hover:text-white">−</button>
                            <span className="px-3 py-1 text-sm font-bold">{item.quantity}</span>
                            <button type="button" onClick={() => updateCartQuantity(item.cartKey, item.quantity + 1)} className="px-3 py-1 text-zinc-300 transition hover:bg-red-600 hover:text-white">+</button>
                          </div>
                          <p className="text-sm font-black text-red-500">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 border-t border-zinc-800 pt-6">
                <div className="flex items-center justify-between text-sm uppercase tracking-widest text-zinc-400">
                  <span>Subtotal</span>
                  <span className="text-xl font-black text-white">${cartSubtotal.toFixed(2)}</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">Secure checkout powered by Stripe{checkoutError && <span className="block mt-1 text-red-400">{checkoutError}</span>}</p>

                <button
                  type="button"
                  disabled={cart.length === 0 || isCheckingOut}
                  onClick={handleCheckout}
                  className="mt-6 w-full rounded-xl bg-red-600 px-6 py-4 font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-red-900/30 transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
                >
                  {isCheckingOut ? "Processing..." : cartSubtotal > 0 ? `Pay $${cartSubtotal.toFixed(2)}` : "Checkout"}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-8 sm:gap-12 px-4 sm:px-6 py-12 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-500">Booking & Media</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase leading-tight">Bring Your Untold Story To The Mic</h2>
            <p className="mt-4 sm:mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-300">For guest appearances, athlete interviews, media opportunities, sponsorships, and collaborations.</p>

            <div className="mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl border border-zinc-800 bg-black/60 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <img src={logoUrl} alt="TUS Logo" className="h-12 sm:h-16 w-12 sm:w-16 object-contain" />
                <div>
                  <p className="text-sm sm:text-base font-black uppercase tracking-wide">The Untold Season</p>
                  <p className="text-xs sm:text-sm text-zinc-400">with Heather Gabrielle</p>
                </div>
              </div>
              <p className="mt-4 sm:mt-5 text-xs sm:text-sm leading-relaxed text-zinc-400">Complete the form and the team will follow up regarding bookings, interviews, media, or sponsorship opportunities.</p>
            </div>
          </div>

          <form className="rounded-2xl sm:rounded-[2rem] border border-zinc-800 bg-black p-4 sm:p-6 lg:p-8 shadow-2xl shadow-red-950/20">
            <div className="grid gap-4 sm:gap-5">
              <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Full Name</label>
                  <input type="text" name="name" placeholder="Your name" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-red-600" />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Email Address</label>
                  <input type="email" name="email" placeholder="you@example.com" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-red-600" />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Phone</label>
                  <input type="tel" name="phone" placeholder="Phone number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-red-600" />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Inquiry Type</label>
                  <select name="inquiryType" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white outline-none transition focus:border-red-600">
                    <option>Guest Booking</option>
                    <option>Media / Press</option>
                    <option>Sponsorship</option>
                    <option>Collaboration</option>
                    <option>General Question</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">Message</label>
                <textarea name="message" rows={5} placeholder="Tell us who you are, what sport you are connected to, and what you are interested in." className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-red-600" />
              </div>
            </div>

            <button type="submit" className="mt-5 sm:mt-6 w-full rounded-xl bg-red-600 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white shadow-xl shadow-red-900/30 transition hover:bg-red-500 active:scale-[0.98]">Submit Request</button>
            <p className="mt-3 sm:mt-4 text-center text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-zinc-500">Booking • Interviews • Sponsorships • Media</p>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 bg-black">
        <div className="mx-auto grid max-w-7xl gap-8 sm:gap-10 px-4 sm:px-6 py-10 sm:py-14 md:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={logoUrl} alt="TUS Logo" className="h-14 sm:h-20 w-14 sm:w-20 object-contain" />
              <div>
                <div className="text-sm sm:text-base font-black uppercase tracking-wide">The Untold Season</div>
                <div className="text-xs sm:text-sm text-zinc-500">with Heather Gabrielle</div>
              </div>
            </div>

            <p className="mt-4 sm:mt-5 max-w-sm text-xs sm:text-sm leading-relaxed text-zinc-400">A sports-media platform highlighting untold athlete stories from high school to college to the professional level.</p>
          </div>

          <div aria-label="Footer site navigation">
            <h3 className="mb-3 sm:mb-5 text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white">Navigate</h3>
            <div className="grid gap-2 sm:gap-3 text-xs sm:text-sm uppercase tracking-widest text-zinc-400">
              <a href="#home" className="transition hover:text-red-500">Home</a>
              <a href="#host" className="transition hover:text-red-500">Meet The Host</a>
              <a href="#videos" className="transition hover:text-red-500">Latest Videos</a>
              <a href="#episodes" className="transition hover:text-red-500">Episodes</a>
              <a href="#store" className="transition hover:text-red-500">Official Store</a>
              <a href="#contact" className="transition hover:text-red-500">Contact / Booking</a>
            </div>
          </div>

          <div aria-label="Footer video and booking links">
            <h3 className="mb-3 sm:mb-5 text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white">Watch & Connect</h3>
            <div className="grid gap-2 sm:gap-3 text-xs sm:text-sm uppercase tracking-widest text-zinc-400">
              <a href="https://www.youtube.com/watch?v=X2Ukw40LMTI" target="_blank" rel="noreferrer" className="transition hover:text-red-500">Latest Episode</a>
              <a href="https://www.youtube.com/watch?v=vJ4UBKezT-0" target="_blank" rel="noreferrer" className="transition hover:text-red-500">Second Episode</a>
              <a href="https://www.youtube.com/watch?v=F0SZSzeh2QA" target="_blank" rel="noreferrer" className="transition hover:text-red-500">Third Episode</a>
              <a href="https://www.youtube.com/@theuntoldseason" target="_blank" rel="noreferrer" className="transition hover:text-red-500">YouTube Channel</a>
              <a href="#contact" className="transition hover:text-red-500">Guest Booking</a>
              <a href="#contact" className="transition hover:text-red-500">Sponsorships</a>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-900">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-6 text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-zinc-600 md:flex-row">
            <p>© 2026 The Untold Season with Heather Gabrielle</p>
            <div className="flex items-center gap-3 sm:gap-4">
              <a href="#contact" className="transition hover:text-red-500">Media</a>
              <span>•</span>
              <a href="#contact" className="transition hover:text-red-500">Booking</a>
              <span>•</span>
              <a href="#contact" className="transition hover:text-red-500">Sponsors</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
