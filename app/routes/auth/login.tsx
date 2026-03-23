import { Button } from "@heroui/react"
import {
    data,
    Form,
    redirect,
    useNavigation,
} from "react-router"
import { TextInput } from "~/components/heroui/inputs"
import type { Route } from "./+types/login"
import {
    commitFlashSession,
    getFlashSession,
} from "~/config/flash-session"
import { getAuthSession } from "~/config/auth-session"
import { AuthService } from "~/server/services/auth.service"

export async function loader({ request }: Route.LoaderArgs) {
    const authSession = await getAuthSession(request.headers.get("Cookie"))
    const auth = authSession.get("auth")

    // If user is already authenticated, redirect to dashboard
    if (auth?.access_token) {
        return redirect("/dashboard")
    }

    return null
}

export default function LoginPage() {
    const navigation = useNavigation()

    return (
        <div className=''>
            <Form method='post' id='login' className='flex flex-col gap-4'>
                <TextInput
                    label='Phone Number'
                    name='phone'
                />
                <Button
                    type='submit'
                    form='login'
                    color='warning'
                    isLoading={navigation.state === "submitting"}
                >
                    Login
                </Button>
            </Form>
        </div>
    )
}

export async function action({ request }: Route.ActionArgs) {
    const flashSession = await getFlashSession(request.headers.get("Cookie"))
    const params = new URL(request.url)
    const redirectTo = params.searchParams.get("redirectTo")

    const formData = await request.formData()
    const phone = (formData.get("phone") as string)?.trim()

    if (!phone) {
        flashSession.flash("alert", {
            message: "Phone number is required",
            status: "error",
        })
        return data(
            {},
            {
                headers: {
                    "Set-Cookie": await commitFlashSession(flashSession),
                },
            }
        )
    }

    try {
        await AuthService.sendOtp(phone)

        flashSession.flash("alert", {
            status: "success",
            message: "OTP sent to your phone",
        })

        const verifyUrl = redirectTo
            ? `/verify-otp?phone=${encodeURIComponent(phone)}&redirectTo=${encodeURIComponent(redirectTo)}`
            : `/verify-otp?phone=${encodeURIComponent(phone)}`

        return redirect(verifyUrl, {
            headers: {
                "Set-Cookie": await commitFlashSession(flashSession),
            },
        })
    } catch (error: any) {
        console.log(`Error signing in: `, error?.message || error)
        flashSession.flash("alert", {
            message: error?.message || "An error occurred during login",
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
