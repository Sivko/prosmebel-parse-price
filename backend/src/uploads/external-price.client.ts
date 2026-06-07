import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ExternalPriceResponse = {
  productId: number;
  prices?: Record<string, number>;
};

type RawExternalPriceResponse = {
  productId?: number | string;
  id?: number | string;
  ID?: number | string;
  prices?: Record<string, number>;
};

type BlankPricesResponse = {
  deletedCount: number;
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

    return this.normalizeResponse(await response.json());
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

    return this.normalizeResponse(await response.json());
  }

  async deleteExcelPrices(): Promise<BlankPricesResponse> {
    const response = await fetch(`${this.baseUrl}/external-price/blank`, {
      method: 'DELETE',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response));
    }

    const data = (await response.json()) as Partial<BlankPricesResponse>;
    return {
      deletedCount: Number(data.deletedCount ?? 0),
    };
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

  private normalizeResponse(response: unknown): ExternalPriceResponse {
    const data = response as RawExternalPriceResponse;
    const productId = Number(data.productId ?? data.id ?? data.ID);

    if (!Number.isFinite(productId)) {
      throw new Error('External price API response does not contain productId');
    }

    return {
      productId,
      prices: data.prices,
    };
  }
}
