import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Home and kitchen essentials' },
  { name: 'Sports', slug: 'sports', description: 'Sports and fitness equipment' },
  { name: 'Office', slug: 'office', description: 'Office supplies and furniture' },
  { name: 'Fashion', slug: 'fashion', description: 'Clothing and accessories' },
  { name: 'Beauty', slug: 'beauty', description: 'Beauty and personal care' },
  { name: 'Books', slug: 'books', description: 'Books and reading materials' },
  { name: 'Toys', slug: 'toys', description: 'Toys and games' },
  { name: 'Automotive', slug: 'automotive', description: 'Car accessories and parts' },
  { name: 'Garden', slug: 'garden', description: 'Garden tools and supplies' },
];

const productNames = [
  // Electronics
  'Wireless Bluetooth Headphones', 'Smart Watch Pro', 'Laptop Stand', 'USB-C Hub', 'Wireless Mouse',
  'Mechanical Keyboard', 'Monitor Stand', 'Webcam HD', 'Microphone USB', 'Speaker Bluetooth',
  'Tablet Stand', 'Phone Case', 'Screen Protector', 'Power Bank', 'Cable Organizer',
  'Smart Light Bulb', 'Security Camera', 'Router WiFi', 'Smart Plug', 'Fitness Tracker',
  
  // Home & Kitchen
  'Premium Coffee Maker', 'Air Fryer', 'Instant Pot', 'Blender Pro', 'Toaster Oven',
  'Stand Mixer', 'Food Processor', 'Rice Cooker', 'Slow Cooker', 'Electric Kettle',
  'Dishwasher Safe', 'Cutting Board', 'Knife Set', 'Cookware Set', 'Baking Sheets',
  'Storage Containers', 'Can Opener', 'Garlic Press', 'Measuring Cups', 'Kitchen Scale',
  
  // Sports
  'Running Shoes', 'Yoga Mat Premium', 'Dumbbells Set', 'Resistance Bands', 'Jump Rope',
  'Foam Roller', 'Water Bottle', 'Gym Bag', 'Tennis Racket', 'Basketball',
  'Soccer Ball', 'Baseball Glove', 'Golf Clubs', 'Bicycle Helmet', 'Swimming Goggles',
  'Fitness Tracker', 'Pull Up Bar', 'Kettlebell', 'Exercise Ball', 'Yoga Blocks',
  
  // Office
  'Desk Organizer', 'Monitor Arm', 'Ergonomic Chair', 'Standing Desk', 'Desk Lamp',
  'File Organizer', 'Pen Holder', 'Notebook Set', 'Stapler', 'Paper Shredder',
  'Label Maker', 'Calculator', 'Desk Mat', 'Cable Management', 'Whiteboard',
  'Desk Fan', 'USB Hub', 'Laptop Cooling Pad', 'Mouse Pad', 'Desk Drawer',
  
  // Fashion
  'Designer Sunglasses', 'Leather Wallet', 'Watch Classic', 'Backpack', 'Handbag',
  'Sneakers', 'Boots', 'Sandals', 'Jacket', 'Hoodie',
  'Jeans', 'T-Shirt', 'Dress', 'Shirt', 'Pants',
  'Hat', 'Scarf', 'Belt', 'Socks', 'Underwear',
  
  // Beauty
  'Face Moisturizer', 'Sunscreen SPF50', 'Cleanser', 'Toner', 'Serum',
  'Eye Cream', 'Face Mask', 'Lip Balm', 'Makeup Brushes', 'Foundation',
  'Mascara', 'Eyeliner', 'Lipstick', 'Blush', 'Highlighter',
  'Nail Polish', 'Hair Shampoo', 'Conditioner', 'Hair Dryer', 'Straightener',
  
  // Books
  'Fiction Novel', 'Non-Fiction', 'Biography', 'Cookbook', 'Self-Help',
  'Business Book', 'History', 'Science', 'Philosophy', 'Poetry',
  'Comic Book', 'Manga', 'Textbook', 'Dictionary', 'Atlas',
  'Journal', 'Notebook', 'Planner', 'Coloring Book', 'Children Book',
  
  // Toys
  'Action Figure', 'Doll', 'Puzzle', 'Board Game', 'Card Game',
  'Building Blocks', 'Remote Car', 'Drone', 'Robot Toy', 'Stuffed Animal',
  'Art Set', 'Musical Instrument', 'Science Kit', 'Magic Set', 'LEGO Set',
  'Play Kitchen', 'Tool Set', 'Dress Up', 'Outdoor Toys', 'Educational Toy',
  
  // Automotive
  'Car Phone Mount', 'Dash Cam', 'Car Charger', 'Seat Cover', 'Floor Mat',
  'Steering Wheel Cover', 'Air Freshener', 'Tire Gauge', 'Jump Starter', 'Car Vacuum',
  'Car Organizer', 'Sun Shade', 'Trunk Organizer', 'License Plate Frame', 'Car Wash Kit',
  'Wax', 'Polish', 'Tire Shine', 'Interior Cleaner', 'Exterior Cleaner',
  
  // Garden
  'Garden Tool Set', 'Watering Can', 'Garden Hose', 'Plant Pot', 'Garden Gloves',
  'Pruning Shears', 'Shovel', 'Rake', 'Trowel', 'Plant Food',
  'Seeds Pack', 'Garden Decor', 'Outdoor Lights', 'Bird Feeder', 'Plant Stand',
  'Garden Kneeler', 'Wheelbarrow', 'Compost Bin', 'Garden Fence', 'Sprinkler'
];

const vendors = [
  'TechStore', 'WearableTech', 'HomeEssentials', 'SportZone', 'WorkSpace', 'FitLife',
  'StyleHub', 'BeautyCorp', 'BookWorld', 'ToyLand', 'AutoParts', 'GardenPro',
  'SmartHome', 'FitnessPlus', 'OfficeMax', 'FashionForward', 'CosmeticCo', 'ReadMore',
  'PlayTime', 'CarCare', 'GreenThumb', 'TechGiant', 'HomeBase', 'ActiveWear',
  'DeskPro', 'Trendy', 'GlowUp', 'PageTurner', 'FunZone', 'DriveSmart', 'Bloom'
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function main() {
  console.log('🌱 Seeding products and categories...');

  // Create categories
  const createdCategories: any[] = [];
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    createdCategories.push(created);
    console.log(`✅ Category: ${created.name}`);
  }

  // Create products
  const categoryMap: { [key: string]: string } = {
    'Electronics': 'electronics',
    'Home & Kitchen': 'home-kitchen',
    'Sports': 'sports',
    'Office': 'office',
    'Fashion': 'fashion',
    'Beauty': 'beauty',
    'Books': 'books',
    'Toys': 'toys',
    'Automotive': 'automotive',
    'Garden': 'garden',
  };

  // Clear existing products first
  console.log('🗑️  Clearing existing products...');
  await prisma.product.deleteMany({});
  console.log('✅ Cleared existing products');

  let productCount = 0;
  for (let i = 0; i < 1200; i++) {
    const nameIndex = i % productNames.length;
    const baseName = productNames[nameIndex];
    const name = i < productNames.length ? baseName : `${baseName} ${Math.floor(i / productNames.length) + 1}`;
    const slug = slugify(name) + (i >= productNames.length ? `-${Math.floor(i / productNames.length)}` : '');

    // Determine category based on product name patterns
    let categorySlug = 'electronics';
    if (name.includes('Coffee') || name.includes('Kitchen') || name.includes('Cook')) {
      categorySlug = 'home-kitchen';
    } else if (name.includes('Shoes') || name.includes('Yoga') || name.includes('Fitness') || name.includes('Sports')) {
      categorySlug = 'sports';
    } else if (name.includes('Desk') || name.includes('Office') || name.includes('Notebook')) {
      categorySlug = 'office';
    } else if (name.includes('Sunglasses') || name.includes('Wallet') || name.includes('Fashion') || name.includes('Clothing')) {
      categorySlug = 'fashion';
    } else if (name.includes('Beauty') || name.includes('Makeup') || name.includes('Hair')) {
      categorySlug = 'beauty';
    } else if (name.includes('Book') || name.includes('Novel') || name.includes('Reading')) {
      categorySlug = 'books';
    } else if (name.includes('Toy') || name.includes('Game') || name.includes('Play')) {
      categorySlug = 'toys';
    } else if (name.includes('Car') || name.includes('Automotive')) {
      categorySlug = 'automotive';
    } else if (name.includes('Garden') || name.includes('Plant')) {
      categorySlug = 'garden';
    }

    const category = createdCategories.find((c: any) => c.slug === categorySlug);
    if (!category) continue;

    const hasDiscount = Math.random() > 0.3;
    const originalPrice = 10 + Math.random() * 990;
    const discount = hasDiscount ? Math.floor(10 + Math.random() * 50) : null;
    const price = hasDiscount ? originalPrice * (1 - (discount! / 100)) : originalPrice;

    const rating = 3.5 + Math.random() * 1.5;
    const reviews = Math.floor(10 + Math.random() * 1990);
    const stock = Math.floor(Math.random() * 100);

    // Generate product-specific images based on category and name
    const categoryImageMap: { [key: string]: string } = {
      'electronics': 'electronics',
      'home-kitchen': 'kitchen',
      'sports': 'sports',
      'office': 'office',
      'fashion': 'fashion',
      'beauty': 'beauty',
      'books': 'books',
      'toys': 'toys',
      'automotive': 'car',
      'garden': 'garden',
    };
    
    const imageCategory = categoryImageMap[categorySlug] || 'product';
    const imageSeed = `${imageCategory}-${slug}-${i}`;
    const imageUrl = `https://picsum.photos/seed/${imageSeed}/400/400`;
    const images = [
      imageUrl,
      `https://picsum.photos/seed/${imageSeed}-2/400/400`,
      `https://picsum.photos/seed/${imageSeed}-3/400/400`,
    ];

    try {
      await prisma.product.create({
        data: {
          name,
          slug,
          description: `High quality ${name.toLowerCase()} from ${vendors[Math.floor(Math.random() * vendors.length)]}`,
          price,
          originalPrice: hasDiscount ? originalPrice : null,
          discount,
          rating,
          reviews,
          vendor: vendors[Math.floor(Math.random() * vendors.length)],
          stock,
          categoryId: (category as any).id,
          isActive: true,
          image: imageUrl,
          images,
        },
      });
      productCount++;
      if (productCount % 100 === 0) {
        console.log(`✅ Created ${productCount} products...`);
      }
    } catch (error: any) {
      if (error.code !== 'P2002') {
        // Skip duplicate slug errors
        console.error(`Error creating product ${name}:`, error.message);
      }
    }
  }

  console.log(`🎉 Seeding completed! Created ${productCount} products.`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

