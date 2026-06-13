import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import ArtworkCard from "@/components/ArtworkCard";
import { Bookmark } from "lucide-react";

interface Artwork {
  _id: string;
  title: string;
  image: string;
  price: number;
  artist: { name: string };
}

const SavedArtworksTab = () => {
  const { user } = useAuth();
  const [savedArtworks, setSavedArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.savedArtworks?.length) {
      fetchSavedArtworks();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSavedArtworks = async () => {
    try {
      const data = await api<{ artworks: Artwork[] }>('/api/artworks', {
        method: 'GET',
        // Add query to filter by IDs, but for now fetch all and filter
      });
      const saved = user?.savedArtworks ?? [];
      const filtered = data.artworks.filter((a) => saved.includes(a._id));
      setSavedArtworks(filtered);
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (savedArtworks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <Bookmark className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">No saved artworks</p>
        <p className="text-sm text-muted-foreground">Save artworks you like to find them here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {savedArtworks.map((a, i) => (
        <ArtworkCard key={a._id} artwork={a} index={i} />
      ))}
    </div>
  );
};

export default SavedArtworksTab;
