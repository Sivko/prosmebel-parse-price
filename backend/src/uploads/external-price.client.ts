import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ExternalPriceResponse = {
  productId: number;
  prices?: Record<string, number>;
};

@Injectable()
export class ExternalPriceClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('EXTERNAL_PRICE_API_URL') ?? 'https://prosmebel.ru'
    ).replace(/\/$/, '');
    this.token =
      config.get<string>('EXTERNAL_PRICE_TOKEN') ??
      '62e2c239-371b-4498-995e-f190a4965e81';
  }

  async getBySku(sku: string): Promise<ExternalPriceResponse | null> {
    const response = await fetch(
      `${this.baseUrl}/external-price?sku=${encodeURIComponent(sku)}`,
      {
        headers: this.headers(),
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response));
    }

    return response.json() as Promise<ExternalPriceResponse>;
  }

  async writePrice(productId: number, price: number) {
    const response = await fetch(`${this.baseUrl}/external-price`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId, price }),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response));
    }

    return response.json() as Promise<ExternalPriceResponse>;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  private async getErrorMessage(response: Response) {
    const text = await response.text();
    if (!text) {
      return `External price API returned ${response.status}`;
    }

    try {
      const json = JSON.parse(text) as { errorMessage?: string; message?: string };
      return json.errorMessage ?? json.message ?? text;
    } catch {
      return text;
    }
  }
}
