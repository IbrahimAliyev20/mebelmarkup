"use client"

import React from 'react'
import {Popover, PopoverContent, PopoverTrigger} from '../ui/popover'
import {Button} from '../ui/button'
import {ChevronDown} from 'lucide-react'
import {useLocale} from 'next-intl'
import {usePathname, useRouter} from '@/i18n/navigation'
import {useSearchParams} from 'next/navigation'
import {routing} from '@/i18n/routing'

function LanguageSelector() {
    const [isOpen, setIsOpen] = React.useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const activeLocale = useLocale()
    const searchParams = useSearchParams()

    function handleSelect(nextLocale: string) {
        setIsOpen(false)
        const query = Object.fromEntries(searchParams.entries())
        router.replace({ pathname, query }, { locale: nextLocale })
    }

    const locales = routing.locales

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sm">
                    {activeLocale.toUpperCase()}
                    <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-fit p-2">
                <div className="flex flex-col gap-1">
                    {locales.map((locale) => (
                        <button
                            key={locale}
                            type="button"
                            onClick={() => handleSelect(locale)}
                            className={`text-sm text-left px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground ${
                                activeLocale === locale ? 'font-semibold' : 'font-normal'
                            }`}
                        >
                            {locale.toUpperCase()}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default LanguageSelector