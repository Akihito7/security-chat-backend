import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/auth.guard';
import { JwtAuthGuard } from '../guards/auth.guard';
import { SearchUsersDto } from './dto/search-users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  search(
    @Query() { username }: SearchUsersDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.searchByUsername(username, request.user.sub);
  }
}
