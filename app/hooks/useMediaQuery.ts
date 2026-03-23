import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
    // Default to false for SSR
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        // Only run on client side
        if (typeof window === "undefined") {
            return
        }

        const mediaQuery = window.matchMedia(query)

        // Set initial value
        setMatches(mediaQuery.matches)

        // Create event listener
        const handleChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches)
        }

        // Add listener
        mediaQuery.addEventListener("change", handleChange)

        // Cleanup
        return () => {
            mediaQuery.removeEventListener("change", handleChange)
        }
    }, [query])

    return matches
}
