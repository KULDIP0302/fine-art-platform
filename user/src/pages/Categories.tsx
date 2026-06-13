import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import ArtworkCard from "@/components/ArtworkCard";
import { Palette } from "lucide-react";

interface Category {
  _id: string;
  name: string;
}

interface Artwork {
  _id: string;
  title: string;
  image: string;
  price: number;
  category?: { _id?: string; name?: string } | null;
  artist?: { _id: string; name: string; profilePic?: string } | null;
  sellingDisabled?: boolean;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const [categoriesData, artworksData] = await Promise.all([
          api<Category[]>("/api/categories"),
          api<{ artworks: Artwork[] }>("/api/artworks"),
        ]);

        setCategories(categoriesData);
        setArtworks(artworksData.artworks ?? []);
        if (categoriesData.length > 0) {
          setSelected(categoriesData[0]._id);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, []);

  const filtered = useMemo(() => {
    if (!selected) return artworks;
    return artworks.filter((a) => a.category?._id === selected);
  }, [artworks, selected]);

  if (loading) {
    return <div className="py-8 text-center">Loading categories...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Palette className="h-7 w-7 text-primary" />
          Browse by Category
        </h1>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => setSelected(cat._id)}
            className={`rounded-lg border p-4 text-center text-sm font-medium transition-all ${
              selected === cat._id
                ? "border-primary bg-primary/5 text-foreground shadow-sm"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a, i) => (
          <ArtworkCard key={a._id} artwork={a} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">
          No artworks in this category yet.
        </p>
      )}
    </div>
  );
};

export default Categories;
