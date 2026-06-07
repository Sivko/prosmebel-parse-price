import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.getBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      request['user'] = this.jwtService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid authorization token');
    }
  }

  private getBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
