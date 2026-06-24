export const PRICE_REGIONS = ['MSK', 'EKB'] as const;

export type PriceRegion = (typeof PRICE_REGIONS)[number];

export const PRICE_REGION_CONFIG: Record<
  PriceRegion,
  { priceTypeId: number; label: string; defaultBaseUrl: string }
> = {
  MSK: {
    priceTypeId: 17,
    label: 'Москва / СПб',
    defaultBaseUrl: 'https://prosmebel.ru',
  },
  EKB: {
    priceTypeId: 18,
    label: 'Екатеринбург',
    defaultBaseUrl: 'https://ekb.prosmebel.ru',
  },
};

export function getPriceTypeId(region: PriceRegion): number {
  return PRICE_REGION_CONFIG[region].priceTypeId;
}

export function isPriceRegion(value: string): value is PriceRegion {
  return PRICE_REGIONS.includes(value as PriceRegion);
}
