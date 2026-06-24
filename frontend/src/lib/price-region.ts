export const PRICE_REGIONS = ['MSK', 'EKB'] as const

export type PriceRegion = (typeof PRICE_REGIONS)[number]

export const PRICE_REGION_CONFIG: Record<
  PriceRegion,
  { priceTypeId: number; label: string; shortLabel: string }
> = {
  MSK: {
    priceTypeId: 17,
    label: 'Москва / СПб',
    shortLabel: 'МСК',
  },
  EKB: {
    priceTypeId: 18,
    label: 'Екатеринбург',
    shortLabel: 'ЕКБ',
  },
}

export function getRegionLabel(region: PriceRegion) {
  return PRICE_REGION_CONFIG[region].label
}

export function getRegionShortLabel(region: PriceRegion) {
  return PRICE_REGION_CONFIG[region].shortLabel
}

export function getAdminBaseUrl(region: PriceRegion) {
  const envKey =
    region === 'EKB' ? 'VITE_EXTERNAL_PRICE_API_URL_EKB' : 'VITE_EXTERNAL_PRICE_API_URL'
  const fallback =
    region === 'EKB' ? 'https://ekb.prosmebel.ru' : 'https://prosmebel.ru'

  return (import.meta.env[envKey] ?? fallback).replace(/\/+$/, '')
}
