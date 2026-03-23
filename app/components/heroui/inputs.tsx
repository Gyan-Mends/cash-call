import {
    Input,
    Textarea,
    type InputProps,
    type TextAreaProps,
} from "@heroui/react"

export const TextInput = (props: InputProps) => {
    return (
        <Input
            variant='bordered'
            labelPlacement='outside-top'
            color='warning'
            classNames={{
                label: "text-zinc-800 dark:text-white font-medium",
                input: "text-zinc-900 dark:text-white autofill:text-zinc-900 dark:autofill:text-white",
            }}
            {...props}
        />
    )
}

export const TextareaInput = (props: TextAreaProps) => {
    return (
        <Textarea
            variant='bordered'
            labelPlacement='outside-top'
            color='warning'
            classNames={{
                label: "text-zinc-800 dark:text-white font-medium",
            }}
            {...props}
        />
    )
}
