import { motion, AnimatePresence } from "framer-motion"
import type { ReactNode } from "react"
import { X } from "lucide-react"

interface SideDrawerProps {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    title?: string
    footer?: ReactNode
    position?: "left" | "right"
    width?: string
}

export function SideDrawer({
    isOpen,
    onClose,
    children,
    title,
    footer,
    position = "right",
    width = "w-[520px]",
}: SideDrawerProps) {
    const slideDirection = position === "right" ? "100%" : "-100%"
    const positionClass = position === "right" ? "right-0" : "left-0"

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className='fixed inset-0 z-40 backdrop-blur-sm bg-black/20'
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: slideDirection }}
                        animate={{ x: 0 }}
                        exit={{ x: slideDirection }}
                        transition={{
                            type: "tween",
                            duration: 0.3,
                        }}
                        className={`fixed ${positionClass} top-0 z-50 h-full ${width} bg-white dark:bg-zinc-950 dark:border-l dark:border-zinc-800 shadow-2xl flex flex-col`}
                    >
                        {/* Header */}
                        <div className='flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0'>
                            {title && (
                                <h2 className='text-base font-semibold capitalize'>
                                    {title}
                                </h2>
                            )}
                            <button
                                onClick={onClose}
                                className='ml-auto size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors'
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className='flex-1 overflow-y-auto p-5'>
                            {children}
                        </div>

                        {/* Footer */}
                        {footer && (
                            <div className='flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0'>
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
