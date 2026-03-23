import {
    Button,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
    useDisclosure,
    User,
} from "@heroui/react"
import { useNavigate } from "react-router"
import { ChevronDown } from "lucide-react"
import { ConfirmModal } from "./modals"
import type { AuthUserInterface } from "~/config/auth-session"

export function AuthUserDropdown({ user }: { user?: AuthUserInterface }) {
    const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()
    const navigate = useNavigate()

    const handleLogout = () => {
        navigate("/logout")
    }

    const confirmLogout = () => {
        handleLogout()
        onClose()
    }

    return (
        <>
            <Dropdown placement='bottom-start'>
                <DropdownTrigger>
                    <div className='flex items-center gap-3'>
                        <User
                            as='button'
                            avatarProps={{
                                icon: user?.name?.charAt(0).toUpperCase(),
                                isBordered: false,
                                size: "sm",
                                radius: "sm",
                                className: "bg-zinc-900 text-white text-base",
                            }}
                            className='transition-transform'
                            description={user?.phone}
                            name={user?.name}
                            classNames={{
                                name: "font-medium hidden lg:inline-block text-xs",
                                description:
                                    "hidden lg:inline-block text-[10px]",
                            }}
                        />

                        <ChevronDown size={16} />
                    </div>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label='User Actions'
                    variant='flat'
                    onAction={(key) => {
                        if (key === "logout") {
                            onOpen()
                            return
                        }
                        navigate(key as string)
                    }}
                    itemClasses={{
                        title: "text-xs",
                    }}
                >
                    <DropdownItem key='/profile'>
                        My Profile
                    </DropdownItem>
                    <DropdownItem
                        key='logout'
                        color='danger'
                        variant='flat'
                        onPress={onOpen}
                    >
                        Log Out
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>

            {/* logout modal */}
            <ConfirmModal
                size='sm'
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                title='Confirm Logout'
                footer={
                    <Button
                        size='sm'
                        color='danger'
                        onPress={confirmLogout}
                    >
                        Sign Out
                    </Button>
                }
            >
                <p className='text-xs'>Are you sure you want to log out?</p>
            </ConfirmModal>
        </>
    )
}
