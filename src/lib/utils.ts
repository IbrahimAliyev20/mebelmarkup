import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrentLocale(): string {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    // Extract locale from pathname (/en/... -> en)
    const pathname = window.location.pathname
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/)
    if (localeMatch) {
      const locale = localeMatch[1]
      // Validate it's one of our supported locales
      if (['az', 'en', 'ru'].includes(locale)) {
        return locale
      }
    }
  }
  
  // Fallback to default locale
  return 'az'
}

export function getAcceptLanguageHeader(locale?: string): string {
  const currentLocale = locale || getCurrentLocale()
  
  const localeMap: Record<string, string> = {
    'az': 'az-AZ,az;q=0.9,en;q=0.8',
    'en': 'en-US,en;q=0.9,az;q=0.8',
    'ru': 'ru-RU,ru;q=0.9,en;q=0.8'
  }
  
  return localeMap[currentLocale] || localeMap['az']
}
export async function getServerLocale(): Promise<string> {
  try {
    const { getLocale } = await import('next-intl/server')
    return await getLocale()
  } catch {
    return 'az'
  }
}