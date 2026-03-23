import { createCookieSessionStorage } from "react-router"

export type AuthUserInterface = {
    id: string
    name: string
    email?: string
    phone: string
}
export type AuthSessionInterface = {
    auth: {
        access_token: string
        user: AuthUserInterface
        permissions: string[]
        roles: string[]
    }
}

const { getSession, commitSession, destroySession } =
    createCookieSessionStorage<AuthSessionInterface>({
        cookie: {
            name: "__cashcall_auth_session",
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
            sameSite: "lax",
            secrets: [process.env.SESSION_SECRET || "super-duper-secret"],
            secure: process.env.NODE_ENV === "production",
        },
    })

const getAuthSession = getSession
const commitAuthSession = commitSession
const destroyAuthSession = destroySession

export { getAuthSession, commitAuthSession, destroyAuthSession }
