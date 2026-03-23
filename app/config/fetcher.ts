/* eslint-disable @typescript-eslint/no-explicit-any */
import { addToast } from "@heroui/react"
import axios from "axios"
import { getErrorMessage } from "./get-error-message"

export const fetcher = (token: string) => async (url: string) => {
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        return response.data
    } catch (error: any) {
        const status = error.response?.status
        const message = getErrorMessage(error)

        console.error(`[fetcher] ${status || "NETWORK"} — ${url}:`, message)

        // Only redirect on auth failure
        if (status === 401) {
            window.location.href = "/logout"
            return null
        }

        addToast({
            color: "danger",
            description: message,
            title: "Error Fetching Data!",
        })

        return null
    }
}
