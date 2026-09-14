export type Priority = "low" | "medium" | "high" | "critical";
export type Status = "new" | "in_progress" | "on_hold" | "resolved" | "closed";
export type Category =
  | "Hardware"
  | "Software"
  | "Network/Wi-Fi"
  | "Peripherals"
  | "Access/Passwords"
  | "Printing"
  | "Accounts";

export type Role = "end_user" | "technician" | "admin";

export type Note = {
  id: string;
  author: string;
  body: string;
  at: string; // ISO
  internal: boolean;
};

export type Ticket = {
  id: string;
  ref: string;
  title: string;
  description: string;
  requester: string;
  location: string;
  category: Category;
  priority: Priority;
  status: Status;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  notes: Note[];
};

export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
export const STATUSES: Status[] = ["new", "in_progress", "on_hold", "resolved", "closed"];
export const CATEGORIES: Category[] = [
  "Hardware",
  "Software",
  "Network/Wi-Fi",
  "Peripherals",
  "Access/Passwords",
  "Printing",
  "Accounts",
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  in_progress: "In Progress",
  on_hold: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

/** First-response SLA targets, in hours, per priority. */
export const SLA_HOURS: Record<Priority, number> = {
  critical: 2,
  high: 4,
  medium: 8,
  low: 24,
};

export const CURRENT_USER = {
  name: "Melissa Kirabo",
  email: "melissa.kirabo@vicacademy.org",
  role: "admin" as Role,
};

export const TECHNICIANS = [
  "melissa.kirabo@vicacademy.org",
  "daniel.oyoo@vicacademy.org",
  "grace.mwangi@vicacademy.org",
];

const BASE = new Date("2026-09-14T09:00:00Z").getTime();
const h = (n: number) => new Date(BASE - n * 3600_000).toISOString();
const plus = (iso: string, hours: number) =>
  new Date(new Date(iso).getTime() + hours * 3600_000).toISOString();

function make(
  ref: string,
  title: string,
  requester: string,
  location: string,
  category: Category,
  priority: Priority,
  status: Status,
  assignee: string | null,
  agedHours: number,
  description: string,
  notes: Note[] = [],
): Ticket {
  const createdAt = h(agedHours);
  return {
    id: ref,
    ref,
    title,
    description,
    requester,
    location,
    category,
    priority,
    status,
    assignee,
    createdAt,
    updatedAt: h(Math.max(0, agedHours - 2)),
    slaDueAt: plus(createdAt, SLA_HOURS[priority]),
    notes,
  };
}

export const SEED_TICKETS: Ticket[] = [
  make(
    "RC-4181",
    "Printer is not working/turning on.",
    "melissa.kirabo@vicacademy.org",
    "Library",
    "Hardware",
    "medium",
    "new",
    "melissa.kirabo@vicacademy.org",
    48,
    "The library printer shows no lights and will not power on after the weekend outage.",
    [
      {
        id: "n1",
        author: "melissa.kirabo@vicacademy.org",
        body: "Checked the wall socket, still nothing.",
        at: h(46),
        internal: false,
      },
      {
        id: "n2",
        author: "daniel.oyoo@vicacademy.org",
        body: "Suspect blown PSU fuse — spare unit in store room B.",
        at: h(40),
        internal: true,
      },
    ],
  ),
  make(
    "RC-4176",
    "Second monitor not detected on new dock",
    "Nkem Adeyemi",
    "Block A · Room 305",
    "Peripherals",
    "low",
    "new",
    null,
    192,
    "New dock only drives one external display; second monitor stays black.",
  ),
  make(
    "RC-4172",
    "Laptop will not power on after weekend",
    "Aisha Bello",
    "Block B · Room 214",
    "Hardware",
    "critical",
    "new",
    null,
    192,
    "Staff laptop is completely dead, no charging LED.",
  ),
  make(
    "RC-4173",
    "Cannot reach shared drive from meeting room 3",
    "Stephen John",
    "Block A · Meeting Room 3",
    "Network/Wi-Fi",
    "high",
    "in_progress",
    "daniel.oyoo@vicacademy.org",
    190,
    "Shared drive mapping fails with a network path error in meeting room 3 only.",
  ),
  make(
    "RC-4177",
    "ERP client crashes when exporting to Excel",
    "Aisha Bello",
    "Block B · Room 214",
    "Software",
    "high",
    "new",
    null,
    191,
    "Export to Excel closes the ERP client with no error message.",
  ),
  make(
    "RC-4174",
    "Outlook keeps asking for password every hour",
    "Emily Cross",
    "Block C · Room 110",
    "Access/Passwords",
    "medium",
    "in_progress",
    "grace.mwangi@vicacademy.org",
    188,
    "Credential prompt reappears roughly every hour on the desktop client.",
  ),
  make(
    "RC-4175",
    "Finance floor printer jams on every duplex job",
    "James Liu",
    "Block B · Print Bay",
    "Printing",
    "medium",
    "on_hold",
    null,
    216,
    "Duplex jobs jam at the rear tray; simplex prints fine. Waiting on parts.",
  ),
  make(
    "RC-4168",
    "New starter account for lab assistant",
    "Grace Mwangi",
    "Block D · Lab 2",
    "Accounts",
    "low",
    "resolved",
    "grace.mwangi@vicacademy.org",
    260,
    "Provision account, mailbox and lab group access for new lab assistant.",
  ),
  make(
    "RC-4161",
    "Wi-Fi drops in the sports hall during assemblies",
    "Stephen John",
    "Sports Hall",
    "Network/Wi-Fi",
    "high",
    "closed",
    "daniel.oyoo@vicacademy.org",
    400,
    "Access point saturation during full-capacity events. Second AP installed.",
  ),
];

export function slaState(t: Ticket, now: number) {
  const due = new Date(t.slaDueAt).getTime();
  const diffMs = due - now;
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3600_000);
  const mins = Math.floor((abs % 3600_000) / 60_000);
  const label = `${hours}h ${mins}m ${overdue ? "overdue" : "left"}`;
  const total = SLA_HOURS[t.priority] * 3600_000;
  const used = Math.min(1, Math.max(0, (now - new Date(t.createdAt).getTime()) / total));
  const settled = t.status === "resolved" || t.status === "closed";
  return { overdue: overdue && !settled, label, progress: used, settled };
}

export const isActive = (t: Ticket) =>
  t.status === "new" || t.status === "in_progress" || t.status === "on_hold";
