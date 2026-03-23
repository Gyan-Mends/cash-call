import { motion } from "framer-motion"
import type { ReactNode } from "react"

export default function FadeUpPageEntry({
    children,
}: {
    children?: ReactNode
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 20,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
            transition={{
                duration: 0.35,
                type: "tween",
            }}
            className='flex flex-col gap-6'
        >
            {children}
        </motion.div>
    )
}
