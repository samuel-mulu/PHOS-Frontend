import {
  Activity,
  Bell,
  BarChart3,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Package,
  Pill,
  Receipt,
  Shield,
  Stethoscope,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { canRegisterPatient } from "@/lib/permissions";
import { Role, type Role as RoleType } from "@/types/role";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: RoleType[];
};

/** Longest-prefix wins when checking route access. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [
      Role.CEO,
      Role.ADMIN,
      Role.IT_ADMIN,
      Role.REPORTING_OFFICER,
    ],
  },
  {
    href: "/patients",
    label: "Patients",
    icon: Users,
    roles: [
      Role.CEO,
      Role.ADMIN,
      Role.RECEPTIONIST,
      Role.DOCTOR,
      Role.NURSE,
      Role.LAB_TECH,
      Role.LAB_SUPERVISOR,
      Role.PHARMACIST,
      Role.CASHIER,
      Role.FRONT_DESK,
    ],
  },
  {
    href: "/front-desk",
    label: "Front desk",
    icon: LayoutGrid,
    roles: [
      Role.CEO,
      Role.ADMIN,
      Role.RECEPTIONIST,
      Role.CASHIER,
      Role.FRONT_DESK,
    ],
  },
  {
    href: "/reception",
    label: "Reception",
    icon: UserPlus,
    roles: [Role.CEO, Role.ADMIN],
  },
  {
    href: "/nurse",
    label: "Triage",
    icon: Activity,
    roles: [Role.CEO, Role.ADMIN, Role.NURSE],
  },
  {
    href: "/doctor",
    label: "Doctor",
    icon: Stethoscope,
    roles: [Role.CEO, Role.ADMIN, Role.DOCTOR],
  },
  {
    href: "/laboratory",
    label: "Laboratory",
    icon: FlaskConical,
    roles: [Role.CEO, Role.ADMIN, Role.LAB_TECH, Role.LAB_SUPERVISOR],
  },
  {
    href: "/pharmacy",
    label: "Pharmacy",
    icon: Pill,
    roles: [Role.CEO, Role.ADMIN, Role.PHARMACIST],
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: Package,
    roles: [Role.CEO, Role.ADMIN, Role.STOREKEEPER],
  },
  {
    href: "/billing",
    label: "Billing",
    icon: Receipt,
    roles: [
      Role.CEO,
      Role.ADMIN,
      Role.CASHIER,
      Role.RECEPTIONIST,
      Role.FRONT_DESK,
      Role.REPORTING_OFFICER,
    ],
  },
  {
    href: "/cashier",
    label: "Cashier",
    icon: Wallet,
    roles: [Role.CEO, Role.ADMIN],
  },
  {
    href: "/reconciliation",
    label: "Reconciliation",
    icon: ClipboardList,
    roles: [Role.CEO, Role.ADMIN, Role.CASHIER, Role.FRONT_DESK],
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    roles: Object.values(Role),
  },
  {
    href: "/admin",
    label: "Administration",
    icon: UserCog,
    roles: [Role.CEO, Role.ADMIN, Role.IT_ADMIN],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: [Role.CEO, Role.ADMIN, Role.REPORTING_OFFICER],
  },
  {
    href: "/audit",
    label: "Audit",
    icon: Shield,
    roles: [Role.CEO, Role.ADMIN, Role.IT_ADMIN],
  },
];

const PUBLIC_DASHBOARD_PATHS = ["/forbidden"];

export function navItemsForRole(role: RoleType): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function routeAccessRule(pathname: string): NavItem | null {
  if (PUBLIC_DASHBOARD_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }
  const sorted = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((item) => pathname.startsWith(item.href)) ?? null;
}

export function canAccessRoute(role: RoleType, pathname: string): boolean {
  if (pathname.startsWith("/patients/new")) {
    return canRegisterPatient(role);
  }
  if (pathname.startsWith("/laboratory/orders")) {
    const labOrderRoles: RoleType[] = [
      Role.CEO,
      Role.ADMIN,
      Role.LAB_TECH,
      Role.LAB_SUPERVISOR,
      Role.DOCTOR,
    ];
    return labOrderRoles.includes(role);
  }
  if (pathname.startsWith("/billing/invoices")) {
    const billingInvoiceRoles: RoleType[] = [
      Role.CEO,
      Role.ADMIN,
      Role.CASHIER,
      Role.RECEPTIONIST,
      Role.REPORTING_OFFICER,
    ];
    return billingInvoiceRoles.includes(role);
  }
  if (pathname.startsWith("/pharmacy/prescriptions")) {
    const pharmacyRxRoles: RoleType[] = [
      Role.CEO,
      Role.ADMIN,
      Role.PHARMACIST,
    ];
    return pharmacyRxRoles.includes(role);
  }
  const rule = routeAccessRule(pathname);
  if (!rule) return true;
  return rule.roles.includes(role);
}
