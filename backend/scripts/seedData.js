const Category = require('../models/Category');
const Artwork = require('../models/Artwork');
const User = require('../models/User');

const categoriesData = [
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

const artworksData = [
  {
    title: "Amber Reverie",
    image: "https://picsum.photos/400/500?random=1",
    price: 2400,
    category: "photography",
    artistName: "arjun",
  },
  {
    title: "Golden Summit",
    image: "https://picsum.photos/400/500?random=2",
    price: 3200,
    category: "Landscape",
    artistName: "Marcus Chen",
  },
  {
    title: "Wildflower Meadow",
    image: "https://picsum.photos/400/500?random=3",
    price: 1800,
    category: "Contemporary",
    artistName: "Sophie Laurent",
  },
  {
    title: "Ceramic Whispers",
    image: "https://picsum.photos/400/500?random=4",
    price: 1500,
    category: "Still Life",
    artistName: "Sophie Laurent",
  },
  {
    title: "Crimson Dialogue",
    image: "https://picsum.photos/400/500?random=5",
    price: 4500,
    category: "Abstract",
    artistName: "Elena Vasquez",
  },
  {
    title: "Dawn Tide",
    image: "https://picsum.photos/400/500?random=6",
    price: 2800,
    category: "Landscape",
    artistName: "Marcus Chen",
  },
];

const seedData = async () => {
  try {
    // Seed categories
    const existingCategories = await Category.find();
    if (existingCategories.length === 0) {
      const categories = categoriesData.map(name => ({ name, slug: name.toLowerCase().replace(/\s+/g, '-') }));
      await Category.insertMany(categories);
      console.log('Categories seeded');
    }

    // Seed artists (users with approved artist application)
    const artists = ['Elena Vasquez', 'Marcus Chen', 'Sophie Laurent'];
    for (const name of artists) {
      const existing = await User.findOne({ name });
      if (!existing) {
        await User.create({
          name,
          email: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          password: 'password123',
          role: 'user',
          artistApplication: {
            status: 'approved',
            appliedAt: new Date(),
            reviewedAt: new Date(),
          },
        });
        console.log(`Artist ${name} seeded with approved status`);
      }
    }

    // Seed artworks
    const existingArtworks = await Artwork.find();
    if (existingArtworks.length === 0) {
      for (const art of artworksData) {
        const category = await Category.findOne({ name: art.category });
        const artist = await User.findOne({ name: art.artistName });
        if (category && artist) {
          await Artwork.create({
            title: art.title,
            image: art.image,
            price: art.price,
            category: category._id,
            artist: artist._id,
            status: 'active',
          });
        }
      }
      console.log('Artworks seeded');
    }
  } catch (err) {
    console.error('Seed data error:', err.message);
  }
};

module.exports = seedData;
