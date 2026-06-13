import artwork1 from "@/assets/artwork1.jpg";
import artwork2 from "@/assets/artwork2.jpg";
import artwork3 from "@/assets/artwork3.jpg";
import artwork4 from "@/assets/artwork4.jpg";
import artwork5 from "@/assets/artwork5.jpg";
import artwork6 from "@/assets/artwork6.jpg";

export interface Artist {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  followers: number;
  artworks: string[];
}

export interface Artwork {
  id: string;
  title: string;
  image: string;
  artistId: string;
  artistName: string;
  category: string;
  price: number;
  description: string;
  medium: string;
  dimensions: string;
  year: number;
}

export interface Order {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkImage: string;
  artistName: string;
  price: number;
  platformFee: number;
  totalPaid: number;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  courierName?: string;
  trackingId?: string;
  date: string;
}

export const categories = [
  "Abstract",
  "Landscape",
  "Still Life",
  "Contemporary",
  "Madhubani",
  "Warli",
  "Tanjore",
  "Pattachitra",
  "Mughal Miniature",
  "Rajasthani",
  "Kalamkari",
  "Pichwai",
  "Gond Art",
  "Kerala Mural",
];

export const artists: Artist[] = [
  {
    id: "a1",
    name: "Elena Vasquez",
    bio: "Contemporary abstract artist exploring the boundaries between color and emotion. Based in Barcelona, her work has been exhibited in galleries across Europe.",
    avatar: "https://i.pravatar.cc/150?img=1",
    followers: 2340,
    artworks: ["1", "5"],
  },
  {
    id: "a2",
    name: "Marcus Chen",
    bio: "Landscape painter capturing the golden hours of mountain ranges. His impressionist approach brings warmth to every canvas.",
    avatar: "https://i.pravatar.cc/150?img=3",
    followers: 1856,
    artworks: ["2", "6"],
  },
  {
    id: "a3",
    name: "Sophie Laurent",
    bio: "Floral and botanical artist creating vibrant, life-affirming compositions. Her studio in Provence inspires her vivid palette.",
    avatar: "https://i.pravatar.cc/150?img=5",
    followers: 3102,
    artworks: ["3", "4"],
  },
];

export const artworks: Artwork[] = [
  {
    id: "1",
    title: "Amber Reverie",
    image: artwork1,
    artistId: "a1",
    artistName: "Elena Vasquez",
    category: "Abstract",
    price: 2400,
    description: "A bold exploration of warm terracotta and amber tones, this piece captures the essence of Mediterranean light filtering through ancient walls.",
    medium: "Oil on Canvas",
    dimensions: "80 × 100 cm",
    year: 2024,
  },
  {
    id: "2",
    title: "Golden Summit",
    image: artwork2,
    artistId: "a2",
    artistName: "Marcus Chen",
    category: "Landscape",
    price: 3200,
    description: "An impressionist rendering of sunset over a mountain range, where golden light cascades across layered peaks.",
    medium: "Oil on Canvas",
    dimensions: "90 × 120 cm",
    year: 2024,
  },
  {
    id: "3",
    title: "Wildflower Meadow",
    image: artwork3,
    artistId: "a3",
    artistName: "Sophie Laurent",
    category: "Floral",
    price: 1800,
    description: "A celebration of nature's palette, this painting captures the joyful chaos of a wildflower field in full bloom.",
    medium: "Oil on Canvas",
    dimensions: "70 × 90 cm",
    year: 2025,
  },
  {
    id: "4",
    title: "Ceramic Whispers",
    image: artwork4,
    artistId: "a3",
    artistName: "Sophie Laurent",
    category: "Still Life",
    price: 1500,
    description: "A minimalist still life featuring a ceramic vase with dried flowers, evoking a sense of quiet beauty and wabi-sabi aesthetics.",
    medium: "Acrylic on Canvas",
    dimensions: "60 × 80 cm",
    year: 2025,
  },
  {
    id: "5",
    title: "Crimson Dialogue",
    image: artwork5,
    artistId: "a1",
    artistName: "Elena Vasquez",
    category: "Expressionism",
    price: 4500,
    description: "A powerful conversation between crimson and navy, this expressionist piece demands attention with its bold gestural strokes.",
    medium: "Mixed Media on Canvas",
    dimensions: "120 × 150 cm",
    year: 2024,
  },
  {
    id: "6",
    title: "Dawn Tide",
    image: artwork6,
    artistId: "a2",
    artistName: "Marcus Chen",
    category: "Seascape",
    price: 2800,
    description: "A serene seascape capturing the moment dawn meets the ocean, painted with soft watercolor washes of turquoise and blush.",
    medium: "Watercolor on Paper",
    dimensions: "50 × 70 cm",
    year: 2025,
  },
];

export const sampleOrders: Order[] = [
  {
    id: "ord-001",
    artworkId: "2",
    artworkTitle: "Golden Summit",
    artworkImage: artwork2,
    artistName: "Marcus Chen",
    price: 3200,
    platformFee: 320,
    totalPaid: 3520,
    status: "delivered",
    courierName: "ArtShip Express",
    trackingId: "ASE-78234",
    date: "2025-12-15",
  },
  {
    id: "ord-002",
    artworkId: "4",
    artworkTitle: "Ceramic Whispers",
    artworkImage: artwork4,
    artistName: "Sophie Laurent",
    price: 1500,
    platformFee: 150,
    totalPaid: 1650,
    status: "shipped",
    courierName: "Fine Art Logistics",
    trackingId: "FAL-91023",
    date: "2026-01-20",
  },
  {
    id: "ord-003",
    artworkId: "1",
    artworkTitle: "Amber Reverie",
    artworkImage: artwork1,
    artistName: "Elena Vasquez",
    price: 2400,
    platformFee: 240,
    totalPaid: 2640,
    status: "processing",
    date: "2026-02-05",
  },
];
