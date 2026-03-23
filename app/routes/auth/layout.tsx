import { Outlet } from "react-router"

export default function AuthLayout() {
    return (
        <div className='flex min-h-screen flex-col lg:flex-row'>
            {/* header */}
            <div
                className='w-full lg:w-1/2 bg-center bg-cover bg-no-repeat h-52 lg:h-auto bg-brand'
            ></div>

            {/* content */}
            <div className='flex-1 flex items-center justify-center px-4'>
                <div className='w-full md:w-1/2 lg:w-1/3'>
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
