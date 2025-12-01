import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const items = cartItems.map((item) => ({
      id: item.id,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        originalPrice: item.product.originalPrice ? Number(item.product.originalPrice) : undefined,
        image: item.product.image,
        discount: item.product.discount,
        vendor: item.product.vendor,
      },
      quantity: item.quantity,
    }));

    const total = items.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);

    return {
      items,
      total: Number(total.toFixed(2)),
      count: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async addToCart(userId: string, productId: string, quantity: number = 1) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingItem) {
      const updated = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          product: true,
        },
      });
      return {
        id: updated.id,
        product: {
          id: updated.product.id,
          name: updated.product.name,
          price: Number(updated.product.price),
          image: updated.product.image,
        },
        quantity: updated.quantity,
      };
    }

    const newItem = await this.prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity,
      },
      include: {
        product: true,
      },
    });

    return {
      id: newItem.id,
      product: {
        id: newItem.product.id,
        name: newItem.product.name,
        price: Number(newItem.product.price),
        image: newItem.product.image,
      },
      quantity: newItem.quantity,
    };
  }

  async updateCartItem(userId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
      return null;
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: true,
      },
    });

    return {
      id: updated.id,
      product: {
        id: updated.product.id,
        name: updated.product.name,
        price: Number(updated.product.price),
        image: updated.product.image,
      },
      quantity: updated.quantity,
    };
  }

  async removeFromCart(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    return { message: 'Cart cleared' };
  }
}

