import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (query.category) {
      where.category = {
        slug: query.category,
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
        image: p.image,
        images: p.images,
        rating: Number(p.rating),
        reviews: p.reviews,
        discount: p.discount,
        vendor: p.vendor,
        stock: p.stock,
        category: {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      image: product.image,
      images: product.images,
      rating: Number(product.rating),
      reviews: product.reviews,
      discount: product.discount,
      vendor: product.vendor,
      stock: product.stock,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
    };
  }

  async getCategories() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
    }));
  }

  async create(userId: string, createProductDto: CreateProductDto) {
    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Category not found');
    }

    // Generate slug from product name
    const slug = createProductDto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + `-${Date.now()}`;

    // Check if slug already exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      throw new BadRequestException('Product with similar name already exists');
    }

    // Create product
    const product = await this.prisma.product.create({
      data: {
        name: createProductDto.name,
        slug,
        description: createProductDto.description,
        price: createProductDto.price,
        originalPrice: createProductDto.originalPrice,
        discount: createProductDto.discount,
        vendor: createProductDto.shopName, // Use shopName as vendor
        stock: createProductDto.stock || 0,
        image: createProductDto.image,
        images: createProductDto.images || (createProductDto.image ? [createProductDto.image] : []),
        categoryId: createProductDto.categoryId,
        isActive: true,
        rating: 0,
        reviews: 0,
      },
      include: {
        category: true,
      },
    });

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      image: product.image,
      images: product.images,
      rating: Number(product.rating),
      reviews: product.reviews,
      discount: product.discount,
      vendor: product.vendor,
      stock: product.stock,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
    };
  }
}

