import {
    data,
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
} from "react-router"

import type { Route } from "./+types/root"
import "./app.css"
import { addToast, HeroUIProvider, ToastProvider } from "@heroui/react"
import { ThemeProvider } from "next-themes"
import { useEffect } from "react"
import { getFlashSession } from "~/config/flash-session"

export const links: Route.LinksFunction = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
]

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en'>
            <head>
                <meta charSet='utf-8' />
                <meta
                    name='viewport'
                    content='width=device-width, initial-scale=1'
                />
                <Meta />
                <Links />
            </head>
            <body>
                <HeroUIProvider>
                    <ThemeProvider enableSystem={false} attribute={"class"}>
                        {children}
                    </ThemeProvider>
                    <ToastProvider
                        placement='bottom-right'
                    />
                    <ScrollRestoration />
                    <Scripts />
                </HeroUIProvider>
            </body>
        </html>
    )
}

export default function App() {
    const loaderData = useLoaderData<typeof loader>()
    useEffect(() => {
        if (loaderData?.status === "error") {
            addToast({
                color: "danger",
                description: loaderData.message,
                title: "Error Occurred!",
            })
        }

        if (loaderData?.status === "success") {
            addToast({
                color: "success",
                title: "Successful!",
                description: loaderData.message,
            })
        }
    }, [loaderData])
    return <Outlet />
}

export async function loader({ request }: Route.LoaderArgs) {
    const flashSession = await getFlashSession(request.headers.get("Cookie"))

    const alert = flashSession.get("alert")

    return data(alert)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = "Oops!"
    let details = "An unexpected error occurred."
    let stack: string | undefined

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "404" : "Error"
        details =
            error.status === 404
                ? "The requested page could not be found."
                : error.statusText || details
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message
        stack = error.stack
    }

    return (
        <main className='pt-16 p-4 container mx-auto'>
            <h1>{message}</h1>
            <p>{details}</p>
            {stack && (
                <pre className='w-full p-4 overflow-x-auto'>
                    <code>{stack}</code>
                </pre>
            )}
        </main>
    )
}
