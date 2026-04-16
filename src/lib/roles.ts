export const USER_ROLES = {
    GRUENDER: "gründer",
    ADMIN: "admin",
    MEMBER: "member",
    VIEWER: "viewer",
    STAFF: "staff",
    PRAEVENTIONSBEAUFTRAGTER: "präventionsbeauftragter",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ORG_STATUS_VALUES = ["active", "inactive", "suspended"] as const;
