import { createCookieSessionStorage } from "react-router"

export type FlashAlert = {
    alert: {
        message: string
        status: "success" | "error"
    }
}

const { getSession, commitSession } = createCookieSessionStorage<FlashAlert>({
    cookie: {
        name: "__cashcall_flash_session",
        httpOnly: true,
        maxAge: 1,
        path: "/",
        sameSite: "lax",
        secrets: ["super-duper-secret"],
        secure: process.env.NODE_ENV === "production",
    },
})

const getFlashSession = getSession
const commitFlashSession = commitSession

export { getFlashSession, commitFlashSession }
