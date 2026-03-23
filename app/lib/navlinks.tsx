import {
    LayoutDashboard,
    Users,
    Ship,
    Wrench,
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
        label: "Shipments",
        icon: <Ship size={16} />,
        href: "/shipments",
    },
    {
        label: "Critical Spares",
        icon: <Wrench size={16} />,
        href: "/critical-spares",
    },
    {
        label: "Users",
        icon: <Users size={16} />,
        href: "/users",
        permittedRoles: ["admin"],
    },
]
