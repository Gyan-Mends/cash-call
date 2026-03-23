import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { MoreVertical, Eye, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

interface ActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  className?: string;
  onPress?: () => void;
}

interface ActionDropdownProps {
  onAction?: (key: string) => void;
  items?: ActionItem[];
  actions?: ActionItem[];
}

const defaultItems: ActionItem[] = [
  { key: "view", label: "View Details", icon: <Eye size={16} /> },
  { key: "edit", label: "Edit", icon: <Pencil size={16} /> },
  {
    key: "delete",
    label: "Delete",
    icon: <Trash2 size={16} />,
    color: "danger",
    className: "text-danger",
  },
];

export function ActionDropdown({
  onAction,
  items,
  actions,
}: ActionDropdownProps) {
  const actionItems = actions || items || defaultItems;

  const handleAction = (key: string) => {
    const action = actionItems.find((item) => item.key === key);
    if (action?.onPress) {
      action.onPress();
    } else if (onAction) {
      onAction(key);
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly size="sm" variant="light">
          <MoreVertical size={16} />
        </Button>
      </DropdownTrigger>
      <DropdownMenu onAction={(key) => handleAction(key as string)}>
        {actionItems.map((item) => (
          <DropdownItem
            key={item.key}
            startContent={item.icon}
            color={item.color}
            className={item.className}
          >
            {item.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
