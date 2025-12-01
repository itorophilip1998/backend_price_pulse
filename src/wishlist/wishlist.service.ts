import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return wishlistItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        description: item.product.description,
        price: Number(item.product.price),
        originalPrice: item.product.originalPrice ? Number(item.product.originalPrice) : undefined,
        image: item.product.image,
        images: item.product.images,
        rating: Number(item.product.rating),
        reviews: item.product.reviews,
        discount: item.product.discount,
        vendor: item.product.vendor,
        stock: item.product.stock,
        category: {
          id: item.product.category.id,
          name: item.product.category.name,
          slug: item.product.category.slug,
        },
      },
    }));
  }

  async add(userId: string, productId: string) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    // Check if already in wishlist
    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Add to wishlist
    return this.prisma.wishlistItem.create({
      data: {
        userId,
        productId,
      },
    });
  }

  async remove(userId: string, productId: string) {
    const wishlistItem = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Item not found in wishlist');
    }

    await this.prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { success: true };
  }

  async clear(userId: string) {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId },
    });

    return { success: true };
  }

  async count(userId: string) {
    return this.prisma.wishlistItem.count({
      where: { userId },
    });
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return !!item;
  }
}

