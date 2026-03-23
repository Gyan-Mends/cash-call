import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    // Auth routes
    layout("routes/auth/layout.tsx", [
        route("login", "routes/auth/login.tsx"),
        route("verify-otp", "routes/auth/verify-otp.tsx"),
    ]),
    route("logout", "routes/auth/logout.ts"),

    // Protected routes
    layout("routes/protected/layout.tsx", [
        route("dashboard", "routes/protected/dashboard.tsx"),
        route("users", "routes/protected/users/user-list.tsx"),
    ]),

    // Redirect root to dashboard
    index("routes/home.tsx"),
] satisfies RouteConfig;
