import { Select, type SelectProps } from "@heroui/react"

export const SelectInput = (props: SelectProps) => {
    const { items, ...otherProps } = props

    const processedItems = items
        ? Array.from(items).map((item: any) => ({
              key: item.key || item.value,
              value: item.value || item.label,
          }))
        : undefined

    const selectProps = processedItems ? { items: processedItems } : {}

    return (
        <Select
            color='warning'
            variant='bordered'
            labelPlacement='outside'
            placeholder=' '
            classNames={{
                label: "text-zinc-900 dark:text-white text-sm font-medium",
                value: "text-black/90 dark:text-white/90",
                trigger: "min-h-unit-12 py-2",
            }}
            {...otherProps}
            {...selectProps}
        />
    )
}
