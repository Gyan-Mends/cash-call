import { Button, InputOtp } from "@heroui/react"
import { useState } from "react"
import {
    data,
    Form,
    redirect,
    useNavigation,
    useSearchParams,
} from "react-router"
import type { Route } from "./+types/verify-otp"
import {
    commitFlashSession,
    getFlashSession,
} from "~/config/flash-session"
import { commitAuthSession, getAuthSession } from "~/config/auth-session"
import { AuthService } from "~/server/services/auth.service"

export async function loader({ request }: Route.LoaderArgs) {
    const authSession = await getAuthSession(request.headers.get("Cookie"))
    const auth = authSession.get("auth")

    if (auth?.access_token) {
        return redirect("/dashboard")
    }

    const url = new URL(request.url)
    const phone = url.searchParams.get("phone")

    if (!phone) {
        return redirect("/login")
    }

    return null
}

export default function VerifyOtpPage() {
    const navigation = useNavigation()
    const [searchParams] = useSearchParams()
    const phone = searchParams.get("phone") || ""
    const [otp, setOtp] = useState("")

    return (
        <div className=''>
            <p className='text-sm text-zinc-500 mb-4'>
                Enter the verification code sent to <strong>{phone}</strong>
            </p>
            <Form method='post' id='verify-otp' className='flex flex-col gap-4'>
                <input type='hidden' name='phone' value={phone} />
                <input type='hidden' name='code' value={otp} />
                <InputOtp
                    length={4}
                    value={otp}
                    onValueChange={setOtp}
                    color='warning'
                    variant='bordered'
                    size='lg'
                    autoFocus
                />
                <Button
                    type='submit'
                    form='verify-otp'
                    color='warning'
                    isDisabled={otp.length < 4}
                    isLoading={navigation.state === "submitting"}
                >
                    Verify
                </Button>
                <Form method='post' action='/login' className='flex justify-center'>
                    <input type='hidden' name='phone' value={phone} />
                    <Button
                        type='submit'
                        variant='light'
                        color='warning'
                        size='sm'
                    >
                        Resend Code
                    </Button>
                </Form>
            </Form>
        </div>
    )
}

export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers()
    const flashSession = await getFlashSession(request.headers.get("Cookie"))
    const authSession = await getAuthSession(request.headers.get("Cookie"))
    const params = new URL(request.url)
    const redirectTo = params.searchParams.get("redirectTo")

    const formData = await request.formData()
    const phone = formData.get("phone") as string
    const code = formData.get("code") as string

    try {
        const result = await AuthService.verifyOtp(phone, code)

        authSession.set("auth", {
            access_token: result.access_token,
            user: {
                id: String(result.user.id),
                name: result.user.name,
                email: result.user.email,
                phone: result.user.phone || phone,
            },
            permissions: result.permissions || [],
            roles: result.roles || [],
        })

        flashSession.flash("alert", {
            status: "success",
            message: "Login successful...",
        })

        headers.append("Set-Cookie", await commitFlashSession(flashSession))
        headers.append("Set-Cookie", await commitAuthSession(authSession))

        const destination = redirectTo || "/dashboard"

        return redirect(destination, {
            headers: headers,
        })
    } catch (error: any) {
        console.log(`Error verifying OTP: `, error?.message || error)
        flashSession.flash("alert", {
            message: error?.message || "An error occurred during verification",
            status: "error",
        })
    }

    return data(
        {},
        {
            headers: {
                "Set-Cookie": await commitFlashSession(flashSession),
            },
        }
    )
}
