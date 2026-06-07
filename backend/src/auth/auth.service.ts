import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(login: string, password: string) {
    const user = await this.usersService.findByLogin(login);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const payload = {
      userId: user._id.toString(),
      login: user.login,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: payload,
    };
  }
}
