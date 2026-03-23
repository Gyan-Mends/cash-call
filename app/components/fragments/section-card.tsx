import { Card, CardBody } from "@heroui/react"
import type { ReactNode } from "react"

export type SectionCardProps = {
    children?: ReactNode
}

export default function SectionCard(props: SectionCardProps) {
    return (
        <Card
            shadow='none'
            className='border-1.5 lg:border-2 border-zinc-300 dark:border-zinc-600 bg-transparent'
        >
            <CardBody>{props.children}</CardBody>
        </Card>
    )
}
