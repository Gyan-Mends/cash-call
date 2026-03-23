/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Table,
  TableBody,
  TableColumn,
  TableHeader,
  type TableProps,
  Pagination,
  TableRow,
  TableCell,
  Skeleton,
  Select,
  SelectItem,
} from "@heroui/react";
import { useSearchParams } from "react-router";
import { FolderOpen } from "lucide-react";
import { type ReactNode } from "react";

interface DataTableProps extends TableProps {
  columns: string[];
  children: ReactNode | any;
  isLoading?: boolean;
  totalPages?: number;
  emptyContent?: {
    icon?: ReactNode;
    title: string;
    subtext?: string;
    button?: ReactNode;
  };
  bottomContent?: ReactNode;
}

export const DataTable = (props: DataTableProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const limit = searchParams.get("limit") || "10";
  const page = searchParams.get("page") || "1";

  return (
    <div className="flex flex-col gap-4">
      <Table
        aria-label="Data table"
        classNames={{
          wrapper:
            "vertical-scrollbar horizontal-scrollbar bg-transparent dark:border-zinc-800 border-2",
          td: "text-xs text-slate-900 dark:text-white",
          thead: "sticky top-0 z-10",
          th: "dark:bg-zinc-900 bg-zinc-100",
          tr: "hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-300",
        }}
        bottomContent={
          props.bottomContent ||
          (props.totalPages && props.totalPages > 0 && (
            <div className="flex items-center justify-between">
              <Select
                size="sm"
                radius="sm"
                variant="bordered"
                className="w-20"
                selectedKeys={[limit]}
                aria-label="Limit"
                aria-labelledby="Limit"
                classNames={{
                  value: "dark:!text-white",
                  trigger: [
                    "dark:data-[open=true]:!border-zinc-700",
                    "dark:data-[focus=true]:!border-zinc-700",
                  ],
                }}
                onSelectionChange={(keys) => {
                  setSearchParams({
                    limit: Array.from(keys)[0] as string,
                  });
                }}
              >
                <SelectItem key={"10"}>10</SelectItem>
                <SelectItem key={"20"}>20</SelectItem>
                <SelectItem key={"50"}>50</SelectItem>
                <SelectItem key={"100"}>100</SelectItem>
              </Select>

              <div className="flex items-center gap-2">
                <Pagination
                  total={props.totalPages}
                  page={parseInt(page)}
                  size="sm"
                  showControls
                  radius="sm"
                  color="warning"
                  classNames={{
                    item: "dark:bg-zinc-800 dark:text-white",
                    next: "dark:bg-zinc-800 dark:text-white",
                    prev: "dark:bg-zinc-800 dark:text-white",
                  }}
                  onChange={(page) => {
                    setSearchParams({
                      page: page.toString(),
                      limit: limit,
                    });
                  }}
                />
              </div>
            </div>
          ))
        }
        {...props}
      >
        <TableHeader>
          {props.columns.map((column, index) => (
            <TableColumn className="uppercase" key={index}>
              {column}
            </TableColumn>
          ))}
        </TableHeader>

        <TableBody
          loadingContent={null}
          isLoading={props.isLoading}
          emptyContent={
            <div className="flex flex-col gap-4 items-center justify-center py-32">
              <div className="rounded-full p-6 bg-zinc-300/30 dark:bg-zinc-900">
                {props.emptyContent?.icon || (
                  <FolderOpen
                    size={80}
                    strokeWidth={1.5}
                    className="text-warning"
                  />
                )}
              </div>
              <h3 className="font-semibold text-2xl text-zinc-700 dark:text-zinc-100">
                {props.emptyContent?.title || "No Record Found"}
              </h3>
              {props.emptyContent?.subtext && (
                <p className="text-xs">{props.emptyContent?.subtext}</p>
              )}
              {props.emptyContent?.button}
            </div>
          }
        >
          {props.isLoading
            ? Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({
                    length: props.columns.length,
                  }).map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-6 rounded-lg" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : props.children}
        </TableBody>
      </Table>
    </div>
  );
};
