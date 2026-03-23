import { redirect, type LoaderFunctionArgs } from "react-router"
import { destroyAuthSession, getAuthSession } from "~/config/auth-session"
import { commitFlashSession, getFlashSession } from "~/config/flash-session"
import { AuthService } from "~/server/services/auth.service"

export async function loader({ request }: LoaderFunctionArgs) {
    const headers = new Headers()
    const authSession = await getAuthSession(request.headers.get("Cookie"))
    const flashSession = await getFlashSession(request.headers.get("Cookie"))

    const auth = authSession.get("auth")
    if (auth?.access_token) {
        try {
            await AuthService.logout(auth.access_token)
        } catch {
            // Continue with local logout even if call fails
        }
    }

    // Destroy the auth session
    headers.append("Set-Cookie", await destroyAuthSession(authSession))

    // Set flash message
    flashSession.flash("alert", {
        status: "success",
        message: "You have been logged out successfully",
    })

    headers.append("Set-Cookie", await commitFlashSession(flashSession))

    // Redirect to login page
    return redirect("/login", {
        headers,
    })
}
