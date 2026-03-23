import {
    LayoutDashboard,
    Users,
} from "lucide-react"

export interface NavItem {
    label: string
    icon: React.ReactNode
    href: string
    permittedRoles?: string[]
}

export const navlinks: NavItem[] = [
    {
        label: "Dashboard",
        icon: <LayoutDashboard size={16} />,
        href: "/dashboard",
    },
    {
        label: "Users",
        icon: <Users size={16} />,
        href: "/users",
        permittedRoles: ["admin"],
    },
]
