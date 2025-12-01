import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: CurrentUserPayload) {
    return this.cartService.getCart(user.id);
  }

  @Post('add')
  addToCart(
    @CurrentUser() user: CurrentUserPayload,
    @Body('productId') productId: string,
    @Body('quantity') quantity: number = 1,
  ) {
    return this.cartService.addToCart(user.id, productId, quantity);
  }

  @Put(':itemId')
  updateCartItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.updateCartItem(user.id, itemId, quantity);
  }

  @Delete(':itemId')
  removeFromCart(
    @CurrentUser() user: CurrentUserPayload,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeFromCart(user.id, itemId);
  }

  @Delete()
  clearCart(@CurrentUser() user: CurrentUserPayload) {
    return this.cartService.clearCart(user.id);
  }
}

