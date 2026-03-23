import {
  data,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
} from "react-router";
import { useState, useEffect, type ReactNode } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Button, Image, Progress, Tooltip } from "@heroui/react";
import { SideDrawer } from "~/components/heroui/side-drawer";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { navlinks } from "~/lib/navlinks";
import { AuthUserDropdown } from "~/components/heroui/dropdowns";
import { ThemeSwitcher } from "~/components/theme-switcher";
import { useMediaQuery } from "~/hooks/useMediaQuery";
import type { Route } from "./+types/layout";
import { getAuthSession, commitAuthSession } from "~/config/auth-session";
import { AuthService } from "~/server/services/auth.service";

export default function AppLayout() {
  const { auth, baseUrl } = useLoaderData<typeof loader>();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const storedValue = localStorage.getItem("isCollapsed");
      if (storedValue === "true") return true;
      if (storedValue === "false") return false;
    }
    return false;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  useEffect(() => {
    localStorage.setItem("isCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (isLargeScreen) setMobileNavOpen(false);
  }, [isLargeScreen]);

  const NavItems = () => {
    const userRoles = auth?.roles ?? [];
    return (
      <div className="flex-1 flex flex-col gap-2 py-8 pr-2 justify-center">
        {navlinks
          .filter((navlink) => {
            if (!navlink.permittedRoles || navlink.permittedRoles.length === 0) return true;
            const normalize = (s: string) => s.toLowerCase().replace(/[_\-\s]/g, "");
            return userRoles.some((role: string) =>
              navlink.permittedRoles!.some((pr) => normalize(pr) === normalize(role))
            );
          })
          .map((navlink) => (
            <NavItem
              key={navlink.href}
              label={navlink.label}
              icon={navlink.icon}
              to={navlink.href}
              isCollapsed={isCollapsed}
              onClick={() => setMobileNavOpen(false)}
            />
          ))}
      </div>
    );
  };

  const NavItem = ({
    label,
    icon,
    badgeContent,
    to,
    isCollapsed,
    onClick,
  }: {
    label: string;
    icon: ReactNode;
    badgeContent?: string | number;
    to: string;
    isCollapsed?: boolean;
    onClick?: () => void;
  }) => {
    const { pathname } = useLocation();
    const isActive = pathname === to || pathname.startsWith(`${to}/`);

    if (isCollapsed) {
      return (
        <Tooltip content={label} placement="right">
          <NavLink
            to={to}
            className={`flex items-center justify-center rounded-lg p-2 ${
              isActive ? "bg-black/20 dark:bg-zinc-800" : ""
            }`}
            onClick={onClick}
          >
            <div
              className={`${
                isActive ? "text-black dark:text-white" : "text-black dark:text-white hover:opacity-60"
              } transition-all duration-300`}
            >
              {icon}
            </div>
          </NavLink>
        </Tooltip>
      );
    }

    const navLink = (
      <NavLink
        to={to}
        className={`flex items-center justify-between gap-3 rounded-lg px-2 py-2 ${
          isActive ? "bg-black/20 dark:bg-zinc-800" : ""
        }`}
        onClick={onClick}
      >
        <div
          className={`flex ${
            isActive ? "text-black dark:text-white" : "text-black dark:text-white hover:opacity-60"
          } items-center gap-2 flex-1 transition-all duration-300`}
        >
          {icon}
          <span className="text-xs line-clamp-1 max-w-52">{label}</span>
        </div>
        {badgeContent && (
          <div className="rounded-3xl bg-white px-2 py-[2px] text-xs text-primary-800">
            {badgeContent}
          </div>
        )}
      </NavLink>
    );

    return label.length > 25 ? (
      <Tooltip content={label} placement="right">
        {navLink}
      </Tooltip>
    ) : (
      navLink
    );
  };

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-400">
      {/* Desktop Sidebar */}
      <AnimatePresence initial={false}>
        <motion.div
          initial={false}
          animate={{
            width: isCollapsed ? "5rem" : "16rem",
            transition: { duration: 0.3 },
          }}
          className="hidden lg:block h-screen bg-brand dark:bg-zinc-950 dark:border-r-2 dark:border-zinc-800 p-4 overflow-hidden"
        >
          <div className="flex flex-col justify-between h-full">
            {/* logo and name */}
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "justify-between"
              }`}
            >
              <div className="flex justify-center items-center gap-2 w-full">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1">
                        <h1 className="text-black dark:text-white font-bold text-sm">
                          Cash Call
                        </h1>
                        <p className="text-xs text-black/50 dark:text-white/50">
                          Adamus Resources Ltd
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* nav items */}
            <NavItems />

            <div className="h-20 flex items-center justify-center">
              <div className="w-8 h-px bg-white/20"></div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Mobile Nav Drawer */}
      <SideDrawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        position="left"
        title="Cash Call"
        width="w-60"
      >
        <div className="flex flex-col gap-8 py-4">
          <NavItems />
        </div>
      </SideDrawer>

      {/* page content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto vertical-scrollbar bg-white dark:bg-zinc-950">
        {/* top navbar */}
        <header className="h-14 w-full border-b-2 border-b-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-50 px-4 shadow-md shadow-zinc-300/10 dark:shadow-zinc-800/10">
          <div className="2xl:mx-auto 2xl:max-w-360 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu toggle */}
              <Button
                isIconOnly
                startContent={
                  mobileNavOpen ? (
                    <X strokeWidth={2} />
                  ) : (
                    <PanelLeftOpen className="size-5" />
                  )
                }
                onPress={() => setMobileNavOpen(!mobileNavOpen)}
                size="sm"
                variant="flat"
                className="lg:hidden"
              />
              {/* Desktop sidebar toggle */}
              <Button
                isIconOnly
                startContent={
                  isCollapsed ? (
                    <PanelLeftOpen className="size-5" />
                  ) : (
                    <PanelLeftClose className="size-5" />
                  )
                }
                onPress={toggleSidebar}
                size="sm"
                variant="flat"
                className="hidden lg:flex"
              />
            </div>

            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              {auth?.user && <AuthUserDropdown user={auth?.user} />}
            </div>
          </div>
          <div className="h-2 overflow-hidden">
            {navigation.state === "loading" && (
              <Progress
                aria-label="Loading"
                aria-labelledby="Loading"
                size="sm"
                color="warning"
                isIndeterminate
              />
            )}
          </div>
        </header>

        {/* main content */}
        <main className="flex-1 w-full 2xl:mx-auto 2xl:max-w-360 p-4">
          <Outlet context={{ auth, baseUrl }} />
        </main>
      </div>
    </div>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const authSession = await getAuthSession(request.headers.get("Cookie"));
  const auth = authSession.get("auth");
  const baseUrl = process.env.BASE_URL;

  if (!auth?.access_token) {
    const url = new URL(request.url);
    const redirectTo = url.pathname + url.search;
    return redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // Re-validate token
  try {
    const verified = await AuthService.verifyToken(auth.access_token);

    authSession.set("auth", {
      ...auth,
      user: {
        ...auth.user,
        name: verified.user.name || auth.user.name,
        email: verified.user.email || auth.user.email,
      },
      permissions: verified.permissions,
      roles: verified.roles,
    });

    const headers = new Headers();
    headers.append("Set-Cookie", await commitAuthSession(authSession));

    return data(
      {
        auth: authSession.get("auth"),
        baseUrl,
      },
      { headers }
    );
  } catch {
    // Token invalid/expired — force re-login
    authSession.unset("auth");
    const url = new URL(request.url);
    const redirectTo = url.pathname + url.search;

    return redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, {
      headers: {
        "Set-Cookie": await commitAuthSession(authSession),
      },
    });
  }
}
