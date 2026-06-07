import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type CurrentUserPayload = {
  userId: string;
  login: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request['user'];
  },
);
