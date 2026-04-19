import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AGE_VERIFIED_COOKIE = "greenlog_age_verified";
const AGE_REJECTED_COOKIE = "greenlog_age_rejected";

const AGE_PUBLIC_PATHS = [
    "/age-gate",
    "/age-gate-rejected",
    "/impressum",
    "/datenschutz",
    "/agb",
    "/en/impressum",
    "/en/privacy",
    "/en/terms",
    "/api/health",
];

const AGE_PROTECTED_PATHS = [
    "/",
    "/landing",
    "/strains",
    "/collection",
    "/grows",
    "/community",
    "/feed",
    "/scanner",
    "/profile",
    "/settings",
];

function isPublicAgePath(pathname: string) {
    return AGE_PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isProtectedAgePath(pathname: string) {
    return AGE_PROTECTED_PATHS.some((path) => {
        if (path === "/") return pathname === "/";
        return pathname === path || pathname.startsWith(`${path}/`);
    });
}

export function middleware(request: NextRequest) {
    if (request.method === "OPTIONS") {
        const origin = request.headers.get("origin");
        const allowed = [
            process.env.NEXT_PUBLIC_SITE_URL || "https://green-log-two.vercel.app",
            "http://localhost:3000",
        ];
        if (origin && allowed.includes(origin)) {
            return new NextResponse(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }
        return new NextResponse(null, { status: 405 });
    }

    const { pathname, search } = request.nextUrl;
    if (
        !pathname.startsWith("/api") &&
        !isPublicAgePath(pathname) &&
        isProtectedAgePath(pathname)
    ) {
        if (request.cookies.get(AGE_REJECTED_COOKIE)?.value === "true") {
            return NextResponse.redirect(new URL("/age-gate-rejected", request.url));
        }

        if (request.cookies.get(AGE_VERIFIED_COOKIE)?.value !== "true") {
            const ageGateUrl = new URL("/age-gate", request.url);
            ageGateUrl.searchParams.set("next", `${pathname}${search}`);
            return NextResponse.redirect(ageGateUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
};
