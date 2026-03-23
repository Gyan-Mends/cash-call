import { User } from "@heroui/react";
import type { ReactNode } from "react";

interface ListItemProps {
  name: string;
  description?: string;
  icon: ReactNode;
  avatarClassName?: string;
}

export function ListItem({
  name,
  description,
  icon,
  avatarClassName = "bg-amber-100 dark:bg-amber-900/30",
}: ListItemProps) {
  return (
    <User
      name={name}
      description={description}
      avatarProps={{
        fallback: icon,
        classNames: {
          base: avatarClassName,
          fallback: "text-amber-600 dark:text-amber-400",
        },
        radius: "sm",
        size: "sm",
      }}
      classNames={{
        name: "font-medium text-zinc-900 dark:text-zinc-100",
        description: "text-zinc-500 dark:text-zinc-400 text-xs",
      }}
    />
  );
}
