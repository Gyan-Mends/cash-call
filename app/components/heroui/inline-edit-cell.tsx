import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { Select, SelectItem, Input, Chip, addToast } from "@heroui/react";

interface InlineSelectCellProps {
  itemId: string;
  field: string;
  value: string;
  options: { key: string; label: string }[];
  colorMap?: Record<string, "success" | "warning" | "danger" | "primary" | "default" | "secondary">;
}

export function InlineSelectCell({
  itemId,
  field,
  value,
  options,
  colorMap,
}: InlineSelectCellProps) {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const fetcher = useFetcher();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      const data = fetcher.data as { success: boolean; message: string };
      if (data.success) {
        setEditing(false);
      } else {
        addToast({ title: data.message, color: "danger" });
        setCurrentValue(value);
      }
    }
  }, [fetcher.data, fetcher.state]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setEditing(false);
      }
    }
    if (editing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing]);

  const handleChange = (keys: any) => {
    const newValue = Array.from(keys)[0] as string;
    if (newValue && newValue !== currentValue) {
      setCurrentValue(newValue);
      fetcher.submit(
        { intent: "updateStatus", itemId, field, value: newValue },
        { method: "post" }
      );
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
        <Select
          size="sm"
          variant="bordered"
          color="warning"
          aria-label={field}
          selectedKeys={[currentValue]}
          onSelectionChange={handleChange}
          className="min-w-[140px]"
          classNames={{
            trigger: "min-h-8 h-8 py-0",
            value: "text-xs",
          }}
          isOpen={true}
          onClose={() => setEditing(false)}
        >
          {options.map((opt) => (
            <SelectItem key={opt.key}>{opt.label}</SelectItem>
          ))}
        </Select>
      </div>
    );
  }

  const chipColor = colorMap?.[currentValue] || "default";

  return (
    <div
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <Chip
        size="sm"
        variant="flat"
        color={chipColor}
        classNames={{
          content: "text-xs font-medium",
          base: "hover:opacity-70 transition-opacity border border-transparent hover:border-current",
        }}
      >
        {fetcher.state !== "idle" ? "..." : currentValue || "-"}
      </Chip>
    </div>
  );
}

interface InlineTextCellProps {
  itemId: string;
  field: string;
  value: string;
  placeholder?: string;
}

export function InlineTextCell({
  itemId,
  field,
  value,
  placeholder = "Click to edit",
}: InlineTextCellProps) {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const fetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      const data = fetcher.data as { success: boolean; message: string };
      if (!data.success) {
        addToast({ title: data.message, color: "danger" });
        setCurrentValue(value);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleSave = () => {
    setEditing(false);
    if (currentValue !== value) {
      fetcher.submit(
        { intent: "updateStatus", itemId, field, value: currentValue },
        { method: "post" }
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
    if (e.key === "Escape") {
      setCurrentValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          size="sm"
          variant="bordered"
          color="warning"
          value={currentValue}
          onValueChange={setCurrentValue}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="min-w-[120px]"
          classNames={{
            input: "text-xs",
            inputWrapper: "min-h-8 h-8",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1.5 py-1 -mx-1.5 -my-1 transition-colors min-h-[28px] flex items-center"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <span className="text-xs text-zinc-600 dark:text-zinc-400 max-w-[150px] truncate block">
        {fetcher.state !== "idle" ? "Saving..." : currentValue || (
          <span className="text-zinc-400 dark:text-zinc-600 italic">{placeholder}</span>
        )}
      </span>
    </div>
  );
}

interface InlineAmountCellProps {
  itemId: string;
  field: string;
  value: number;
}

export function InlineAmountCell({
  itemId,
  field,
  value,
}: InlineAmountCellProps) {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(String(value || ""));
  const fetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(String(value || ""));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      const data = fetcher.data as { success: boolean; message: string };
      if (!data.success) {
        addToast({ title: data.message, color: "danger" });
        setCurrentValue(String(value || ""));
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleSave = () => {
    setEditing(false);
    const numVal = parseFloat(currentValue);
    if (!isNaN(numVal) && numVal !== value) {
      fetcher.submit(
        { intent: "updateField", itemId, field, value: String(numVal) },
        { method: "post" }
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setCurrentValue(String(value || ""));
      setEditing(false);
    }
  };

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

  if (editing) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          size="sm"
          variant="bordered"
          color="warning"
          type="number"
          value={currentValue}
          onValueChange={setCurrentValue}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="min-w-[100px]"
          classNames={{
            input: "text-xs",
            inputWrapper: "min-h-8 h-8",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1.5 py-1 -mx-1.5 -my-1 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <span className="font-semibold text-xs">
        {fetcher.state !== "idle" ? "..." : formatted}
      </span>
    </div>
  );
}
