import { useEffect } from 'react'

// While a business's booking page is open, the app that can be installed from
// it is that business's: its manifest, its name under the icon (iOS) and in the
// tab. Leaving restores the cabinet's. The name arrives later than the slug.
export function useBusinessManifest(slug: string, name?: string) {
  useEffect(() => {
    const link = document.head.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    )
    if (!link) return
    const was = link.getAttribute('href')
    link.setAttribute(
      'href',
      `/api/public/businesses/${slug}/manifest.webmanifest`,
    )
    return () => {
      if (was) link.setAttribute('href', was)
    }
  }, [slug])

  useEffect(() => {
    if (!name) return
    const meta = document.head.querySelector(
      'meta[name="apple-mobile-web-app-title"]',
    )
    const was = { title: document.title, app: meta?.getAttribute('content') }
    document.title = name
    meta?.setAttribute('content', name)
    return () => {
      document.title = was.title
      if (was.app != null) meta?.setAttribute('content', was.app)
    }
  }, [name])
}
