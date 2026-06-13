import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import ArtworkCard from "@/components/ArtworkCard";
import { Search as SearchIcon } from "lucide-react";

interface Artwork {
  _id: string;
  title: string;
  image: string;
  price: number;
  category: { name: string };
  artist?: { _id: string; name: string; profilePic?: string } | null;
  sellingDisabled?: boolean;
}

const Search = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q")?.trim() ?? "";
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!q) {
        setArtworks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await api<{ artworks: Artwork[] }>(
          `/api/artworks?search=${encodeURIComponent(q)}&limit=60`,
        );
        setArtworks(data.artworks ?? []);
      } catch {
        setArtworks([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [q]);

  if (!q) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">Search</h1>
        <p className="mt-2 text-muted-foreground">
          Use the search box below the header to find artworks by title or description.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-muted-foreground">
        Searching…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Results for “{q}”
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {artworks.length} artwork{artworks.length === 1 ? "" : "s"} found
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {artworks.map((artwork, i) => (
          <ArtworkCard key={artwork._id} artwork={artwork} index={i} />
        ))}
      </div>
      {artworks.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          No artworks match your search. Try different keywords.
        </p>
      )}
    </div>
  );
};

export default Search;
