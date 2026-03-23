import {
  useLoaderData,
  useSearchParams,
  useNavigate,
  useNavigation,
  useActionData,
  Form,
} from "react-router";
import {
  Button,
  Chip,
  SelectItem,
  addToast,
  TableRow,
  TableCell,
} from "@heroui/react";
import { Plus, Search, User, Users } from "lucide-react";
import { useState, useEffect } from "react";
import FadeUpPageEntry from "~/components/ui/animated-entry";
import { DataTable } from "~/components/heroui/data-table";
import { TextInput } from "~/components/heroui/inputs";
import { SelectInput } from "~/components/heroui/select-inputs";
import { ListItem } from "~/components/heroui/list-item";
import { ActionDropdown } from "~/components/heroui/action-dropdown";
import { SideDrawer } from "~/components/heroui/side-drawer";
import { useDebounce } from "~/hooks/useDebounce";
import type { Route } from "./+types/user-list";
import SectionCard from "~/components/fragments/section-card";

interface UserData {
  id: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  fullName: string;
  phones: { number: string; isPrimary: boolean; isVerified: boolean }[];
  email?: string;
  department?: string;
  userType: string;
  status: string;
  gender?: string;
  locality?: string;
  roles: { name: string; permissions: string[] }[];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getAuthSession } = await import("~/config/auth-session");
  const { connectDB } = await import("~/server/db/connection");
  const { User: UserModel } = await import("~/server/db/models/User");

  const authSession = await getAuthSession(request.headers.get("Cookie"));
  const auth = authSession.get("auth");
  if (!auth?.access_token) return { users: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };

  await connectDB();

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const userType = url.searchParams.get("userType") || "";

  const filter: Record<string, any> = {};

  if (search) {
    const { escapeRegex } = await import("~/server/utils/regex-utils");
    filter.$or = [
      { firstName: { $regex: escapeRegex(search), $options: "i" } },
      { lastName: { $regex: escapeRegex(search), $options: "i" } },
      { otherNames: { $regex: escapeRegex(search), $options: "i" } },
      { email: { $regex: escapeRegex(search), $options: "i" } },
      { "phones.number": { $regex: escapeRegex(search), $options: "i" } },
      { employeeId: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }
  if (status && status !== "all") {
    filter.status = status;
  }
  if (userType && userType !== "all") {
    filter.userType = userType;
  }

  const total = await UserModel.countDocuments(filter);
  const users = await UserModel.find(filter)
    .select("-password_hash")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  const formattedUsers = users.map((u) => {
    const doc = u.toObject({ virtuals: true });
    return {
      id: u._id.toString(),
      employeeId: doc.employeeId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      otherNames: doc.otherNames,
      fullName: doc.fullName || [doc.firstName, doc.otherNames, doc.lastName].filter(Boolean).join(" "),
      phones: doc.phones,
      email: doc.email,
      department: doc.department,
      userType: doc.userType,
      status: doc.status,
      gender: doc.gender,
      locality: doc.locality,
      roles: doc.roles,
    };
  });

  return {
    users: formattedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { connectDB } = await import("~/server/db/connection");
  const { User: UserModel } = await import("~/server/db/models/User");
  const bcrypt = await import("bcryptjs");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    await connectDB();

    if (intent === "create") {
      const firstName = formData.get("firstName") as string;
      const lastName = formData.get("lastName") as string;
      const otherNames = (formData.get("otherNames") as string) || undefined;
      const phone = formData.get("phone") as string;
      const email = (formData.get("email") as string) || undefined;
      const employeeId = (formData.get("employeeId") as string) || undefined;
      const department = (formData.get("department") as string) || undefined;
      const userType = formData.get("userType") as string;
      const locality = (formData.get("locality") as string) || undefined;

      if (!firstName || !lastName || !phone || !userType) {
        return { success: false, message: "First name, last name, phone, and user type are required" };
      }

      // Check for duplicate phone
      const existingPhone = await UserModel.findOne({ "phones.number": phone });
      if (existingPhone) {
        return { success: false, message: "Phone number already in use" };
      }

      // Check for duplicate email
      if (email) {
        const existingEmail = await UserModel.findOne({ email });
        if (existingEmail) {
          return { success: false, message: "Email already in use" };
        }
      }

      // Check for duplicate employeeId
      if (employeeId) {
        const existingEmpId = await UserModel.findOne({ employeeId });
        if (existingEmpId) {
          return { success: false, message: "Employee ID already in use" };
        }
      }

      const password_hash = await bcrypt.default.hash("password123", 10);

      await UserModel.create({
        firstName,
        lastName,
        otherNames,
        phones: [{ number: phone, isPrimary: true, isVerified: false }],
        email,
        employeeId,
        department,
        userType,
        locality,
        password_hash,
        status: "active",
        roles: [{ name: "user", permissions: [] }],
      });

      return { success: true, message: "User created successfully" };
    }

    if (intent === "edit") {
      const userId = formData.get("userId") as string;
      if (!userId) return { success: false, message: "User ID is required" };

      const firstName = formData.get("firstName") as string;
      const lastName = formData.get("lastName") as string;
      const otherNames = formData.get("otherNames") as string;
      const phone = formData.get("phone") as string;
      const email = formData.get("email") as string;
      const employeeId = formData.get("employeeId") as string;
      const department = formData.get("department") as string;
      const userType = formData.get("userType") as string;
      const status = formData.get("status") as string;
      const locality = formData.get("locality") as string;

      const updates: Record<string, any> = {};
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      updates.otherNames = otherNames || null;
      updates.department = department || null;
      if (email) {
        const existingEmail = await UserModel.findOne({ email, _id: { $ne: userId } });
        if (existingEmail) return { success: false, message: "Email already in use by another user" };
        updates.email = email;
      }
      if (phone) {
        const existingPhone = await UserModel.findOne({ "phones.number": phone, _id: { $ne: userId } });
        if (existingPhone) return { success: false, message: "Phone number already in use by another user" };
        // Update the primary phone
        const user = await UserModel.findById(userId);
        if (user) {
          const primaryIdx = user.phones.findIndex((p: { isPrimary: boolean }) => p.isPrimary);
          if (primaryIdx >= 0) {
            user.phones[primaryIdx].number = phone;
          } else if (user.phones.length > 0) {
            user.phones[0].number = phone;
          } else {
            user.phones.push({ number: phone, isPrimary: true, isVerified: false } as any);
          }
          updates.phones = user.phones;
        }
      }
      if (employeeId !== null && employeeId !== undefined) {
        if (employeeId) {
          const existingEmpId = await UserModel.findOne({ employeeId, _id: { $ne: userId } });
          if (existingEmpId) return { success: false, message: "Employee ID already in use by another user" };
        }
        updates.employeeId = employeeId || null;
      }
      if (userType) updates.userType = userType;
      if (status) updates.status = status;
      updates.locality = locality || null;

      await UserModel.findByIdAndUpdate(userId, updates);

      return { success: true, message: "User updated successfully" };
    }

    if (intent === "deactivate") {
      const userId = formData.get("userId") as string;
      await UserModel.findByIdAndUpdate(userId, { status: "inactive" });
      return { success: true, message: "User deactivated successfully" };
    }

    return { success: false, message: "Invalid action" };
  } catch (error: any) {
    console.error("User action error:", error);
    return { success: false, message: error?.message || "An error occurred" };
  }
}

export default function UserListPage() {
  const { users, pagination } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSubmitting = navigation.state === "submitting";

  // Drawer states
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Search with debouncing
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") || ""
  );
  const debouncedSearch = useDebounce(searchValue, 500);
  const currentStatus = searchParams.get("status") || "all";
  const currentUserType = searchParams.get("userType") || "all";

  // Handle debounced search
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  }, [debouncedSearch]);

  // Handle action response
  useEffect(() => {
    if (actionData && navigation.state === "idle") {
      if (actionData.success) {
        addToast({ title: actionData.message, color: "success" });
        setCreateDrawerOpen(false);
        setEditDrawerOpen(false);
        setEditingUser(null);
      } else {
        addToast({
          title: actionData.message,
          color: "danger",
        });
      }
    }
  }, [actionData, navigation.state]);

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleAction = (key: string, user: UserData) => {
    if (key === "edit") {
      setEditingUser(user);
      setEditDrawerOpen(true);
    }
    if (key === "deactivate") {
      const form = document.createElement("form");
      form.method = "post";
      form.style.display = "none";
      const intentInput = document.createElement("input");
      intentInput.name = "intent";
      intentInput.value = "deactivate";
      form.appendChild(intentInput);
      const userIdInput = document.createElement("input");
      userIdInput.name = "userId";
      userIdInput.value = user.id;
      form.appendChild(userIdInput);
      document.body.appendChild(form);
      form.submit();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "pending": return "warning";
      case "inactive": return "default";
      default: return "default";
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case "staff": return "primary";
      case "intern": return "secondary";
      case "nsp": return "warning";
      case "graduate_trainee": return "success";
      default: return "default";
    }
  };

  const columns = ["Name", "Department", "Type", "Status", "Actions"];

  const getPrimaryPhone = (user: UserData) => {
    const primary = user.phones?.find((p) => p.isPrimary);
    return primary?.number || user.phones?.[0]?.number || "";
  };

  return (
    <FadeUpPageEntry>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Users
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage application users
          </p>
        </div>
        <Button
          color="warning"
          startContent={<Plus size={18} />}
          onPress={() => setCreateDrawerOpen(true)}
        >
          Add User
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <TextInput
          placeholder="Search users..."
          startContent={<Search size={18} className="text-zinc-400" />}
          className="sm:max-w-xs"
          value={searchValue}
          onValueChange={setSearchValue}
          isClearable
        />
        <SelectInput
          label=""
          placeholder="User type"
          className="sm:max-w-[150px]"
          selectedKeys={[currentUserType]}
          onSelectionChange={(keys) =>
            handleFilter("userType", Array.from(keys)[0] as string)
          }
        >
          <SelectItem key="all">All Types</SelectItem>
          <SelectItem key="staff">Staff</SelectItem>
          <SelectItem key="intern">Intern</SelectItem>
          <SelectItem key="nsp">NSP</SelectItem>
          <SelectItem key="graduate_trainee">Graduate Trainee</SelectItem>
        </SelectInput>
        <SelectInput
          label=""
          placeholder="Status"
          className="sm:max-w-[140px]"
          selectedKeys={[currentStatus]}
          onSelectionChange={(keys) =>
            handleFilter("status", Array.from(keys)[0] as string)
          }
        >
          <SelectItem key="all">All Status</SelectItem>
          <SelectItem key="active">Active</SelectItem>
          <SelectItem key="pending">Pending</SelectItem>
          <SelectItem key="inactive">Inactive</SelectItem>
        </SelectInput>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden md:block">
        <SectionCard>
          <DataTable
            columns={columns}
            totalPages={pagination.totalPages}
            removeWrapper
            emptyContent={{
              title: "No users found",
              subtext: "Create a new user to get started",
              button: (
                <Button
                  color="warning"
                  onPress={() => setCreateDrawerOpen(true)}
                >
                  Add User
                </Button>
              ),
            }}
          >
            {users.map((user: UserData) => (
              <TableRow key={user.id}>
                <TableCell>
                  <ListItem
                    name={user.fullName}
                    description={user.employeeId || getPrimaryPhone(user)}
                    icon={<User size={18} />}
                  />
                </TableCell>
                <TableCell>
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {user.department || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getUserTypeColor(user.userType)}
                    classNames={{ content: "capitalize text-xs font-medium" }}
                  >
                    {(user.userType || "").replace("_", " ")}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getStatusColor(user.status)}
                    classNames={{ content: "capitalize text-xs font-medium" }}
                  >
                    {user.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  <ActionDropdown
                    onAction={(key) => handleAction(key, user)}
                    items={[
                      { key: "edit", label: "Edit" },
                      {
                        key: "deactivate",
                        label: "Deactivate",
                        color: "danger",
                        className: "text-danger",
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </SectionCard>
      </div>

      {/* Mobile List */}
      <div className="md:hidden flex flex-col gap-1">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <Users
              size={48}
              className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4"
            />
            <p className="text-zinc-500 dark:text-zinc-400">No users found</p>
          </div>
        ) : (
          users.map((user: UserData) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
              onClick={() => {
                setEditingUser(user);
                setEditDrawerOpen(true);
              }}
            >
              <ListItem
                name={user.fullName}
                description={user.employeeId || (user.userType || "").replace("_", " ")}
                icon={<User size={18} />}
              />
              <div className="flex items-center gap-2">
                <Chip
                  size="sm"
                  variant="flat"
                  color={getStatusColor(user.status)}
                  classNames={{ content: "capitalize text-xs" }}
                >
                  {user.status}
                </Chip>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create User Drawer */}
      <SideDrawer
        isOpen={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Add User"
        footer={
          <Button
            color="warning"
            type="submit"
            form="create-user-form"
            size="sm"
            isLoading={isSubmitting}
          >
            Create User
          </Button>
        }
      >
        <Form
          id="create-user-form"
          method="post"
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="intent" value="create" />
          <div className="grid grid-cols-2 gap-4">
            <TextInput name="firstName" label="First Name" isRequired />
            <TextInput name="lastName" label="Last Name" isRequired />
          </div>
          <TextInput name="otherNames" label="Other Names" />
          <div className="grid grid-cols-2 gap-4">
            <TextInput name="phone" label="Phone Number" isRequired />
            <TextInput name="email" label="Email" type="email" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextInput name="employeeId" label="Employee ID" />
            <SelectInput name="userType" label="User Type" isRequired>
              <SelectItem key="staff">Staff</SelectItem>
              <SelectItem key="intern">Intern</SelectItem>
              <SelectItem key="nsp">NSP</SelectItem>
              <SelectItem key="graduate_trainee">Graduate Trainee</SelectItem>
            </SelectInput>
          </div>
          <TextInput name="department" label="Department" />
          <SelectInput
            name="locality"
            label="Locality"
            placeholder="Select locality (optional)"
          >
            <SelectItem key="impacted">Impacted</SelectItem>
            <SelectItem key="local">Local</SelectItem>
            <SelectItem key="national">National</SelectItem>
            <SelectItem key="expat">Expatriate</SelectItem>
          </SelectInput>
        </Form>
      </SideDrawer>

      {/* Edit User Drawer */}
      <SideDrawer
        isOpen={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingUser(null);
        }}
        title="Edit User"
        footer={
          <Button
            color="warning"
            type="submit"
            form="edit-user-form"
            size="sm"
            isLoading={isSubmitting}
          >
            Save Changes
          </Button>
        }
      >
        {editingUser && (
          <Form
            id="edit-user-form"
            method="post"
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="intent" value="edit" />
            <input type="hidden" name="userId" value={editingUser.id} />
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                name="firstName"
                label="First Name"
                defaultValue={editingUser.firstName}
                isRequired
              />
              <TextInput
                name="lastName"
                label="Last Name"
                defaultValue={editingUser.lastName}
                isRequired
              />
            </div>
            <TextInput
              name="otherNames"
              label="Other Names"
              defaultValue={editingUser.otherNames || ""}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                name="phone"
                label="Primary Phone"
                defaultValue={getPrimaryPhone(editingUser)}
                isRequired
              />
              <TextInput
                name="email"
                label="Email"
                type="email"
                defaultValue={editingUser.email || ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                name="employeeId"
                label="Employee ID"
                defaultValue={editingUser.employeeId || ""}
              />
              <SelectInput
                name="userType"
                label="User Type"
                defaultSelectedKeys={[editingUser.userType]}
                isRequired
              >
                <SelectItem key="staff">Staff</SelectItem>
                <SelectItem key="intern">Intern</SelectItem>
                <SelectItem key="nsp">NSP</SelectItem>
                <SelectItem key="graduate_trainee">Graduate Trainee</SelectItem>
              </SelectInput>
            </div>
            <TextInput
              name="department"
              label="Department"
              defaultValue={editingUser.department || ""}
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectInput
                name="status"
                label="Status"
                defaultSelectedKeys={[editingUser.status]}
              >
                <SelectItem key="active">Active</SelectItem>
                <SelectItem key="pending">Pending</SelectItem>
                <SelectItem key="inactive">Inactive</SelectItem>
              </SelectInput>
              <SelectInput
                name="locality"
                label="Locality"
                placeholder="Select locality (optional)"
                defaultSelectedKeys={editingUser.locality ? [editingUser.locality] : []}
              >
                <SelectItem key="impacted">Impacted</SelectItem>
                <SelectItem key="local">Local</SelectItem>
                <SelectItem key="national">National</SelectItem>
                <SelectItem key="expat">Expatriate</SelectItem>
              </SelectInput>
            </div>
          </Form>
        )}
      </SideDrawer>
    </FadeUpPageEntry>
  );
}
