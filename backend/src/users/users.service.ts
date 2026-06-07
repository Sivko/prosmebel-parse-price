import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const login = this.config.get<string>('DEFAULT_ADMIN_LOGIN') ?? 'admin';
    const password =
      this.config.get<string>('DEFAULT_ADMIN_PASSWORD') ?? 'JQ23@rq';
    const exists = await this.userModel.exists({ login });

    if (!exists) {
      await this.create(login, password);
    }
  }

  async create(login: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userModel.create({ login, passwordHash });
  }

  findByLogin(login: string) {
    return this.userModel.findOne({ login }).exec();
  }

  async list(): Promise<Array<Record<string, unknown>>> {
    const users = await this.userModel.find().sort({ createdAt: -1 }).lean();
    return users.map(({ passwordHash: _passwordHash, ...user }) => user);
  }
}
