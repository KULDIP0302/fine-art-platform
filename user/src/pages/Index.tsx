import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ArtworkCard from "@/components/ArtworkCard";
import ChatDialog from "@/components/ChatDialog";

interface Artwork {
  _id: string;
  title: string;
  image: string;
  price: number;
  category: { name: string };
  artist: { _id: string; name: string; profilePic?: string };
  sellingDisabled?: boolean;
}

interface Category {
  _id: string;
  name: string;
}

const Index = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<{ id: string; name: string; avatar: string } | null>(null);

  useEffect(() => {
    fetchArtworks();
    fetchCategories();
  }, []);

  const fetchArtworks = async () => {
    try {
      const data = await api<{ artworks: Artwork[] }>('/api/artworks');
      setArtworks(data.artworks);
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api<Category[]>('/api/categories');
      setCategories(data);
    } catch (error) {
      // handle error
    }
  };

  const openChat = (artistId: string, artistName: string, artistAvatar: string) => {
    setSelectedArtist({ id: artistId, name: artistName, avatar: artistAvatar });
    setChatOpen(true);
  };

  const filtered =
    activeCategory === "All"
      ? artworks
      : artworks.filter((a) => (a.category?.name ?? 'Uncategorized') === activeCategory);

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl animate-fade-up">
          Discover Fine Art
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "100ms" }}>
          Explore curated artworks from talented artists around the world
        </p>
      </section>

      {/* Category Filter */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {["All", ...categories.map(c => c.name)].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Artwork Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((artwork, i) => (
          <ArtworkCard key={artwork._id} artwork={artwork} index={i} onOpenChat={openChat} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">
          No artworks found in this category.
        </p>
      )}

      {/* Chat Dialog */}
      {chatOpen && selectedArtist && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          artistId={selectedArtist.id}
          artistName={selectedArtist.name}
          artistAvatar={selectedArtist.avatar}
        />
      )}
    </div>
  );
};

export default Index;
