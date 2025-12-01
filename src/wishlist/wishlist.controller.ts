import { Controller, Get, Post, Delete, Param, UseGuards, Body } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.wishlistService.findAll(user.id);
  }

  @Get('count')
  getCount(@CurrentUser() user: CurrentUserPayload) {
    return this.wishlistService.count(user.id);
  }

  @Post()
  add(
    @CurrentUser() user: CurrentUserPayload,
    @Body('productId') productId: string,
  ) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.remove(user.id, productId);
  }

  @Delete()
  clear(@CurrentUser() user: CurrentUserPayload) {
    return this.wishlistService.clear(user.id);
  }

  @Get('check/:productId')
  check(
    @CurrentUser() user: CurrentUserPayload,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.isInWishlist(user.id, productId);
  }
}

