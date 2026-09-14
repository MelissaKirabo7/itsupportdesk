import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  CURRENT_USER,
  SEED_TICKETS,
  SLA_HOURS,
  type Note,
  type Priority,
  type Status,
  type Ticket,
} from "./tickets";

type NewTicket = {
  title: string;
  description: string;
  requester: string;
  location: string;
  category: Ticket["category"];
  priority: Priority;
};

type Store = {
  tickets: Ticket[];
  create: (input: NewTicket) => Ticket;
  update: (id: string, patch: Partial<Ticket>) => void;
  claim: (id: string) => void;
  addNote: (id: string, body: string, internal: boolean) => void;
};

const TicketContext = createContext<Store | null>(null);

let counter = 4182;

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(SEED_TICKETS);

  const value = useMemo<Store>(
    () => ({
      tickets,
      create(input) {
        const now = new Date();
        const ref = `RC-${counter++}`;
        const ticket: Ticket = {
          ...input,
          id: ref,
          ref,
          status: "new",
          assignee: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          slaDueAt: new Date(now.getTime() + SLA_HOURS[input.priority] * 3600_000).toISOString(),
          notes: [],
        };
        setTickets((prev) => [ticket, ...prev]);
        return ticket;
      },
      update(id, patch) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
          ),
        );
      },
      claim(id) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  assignee: CURRENT_USER.email,
                  status: (t.status === "new" ? "in_progress" : t.status) as Status,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );
      },
      addNote(id, body, internal) {
        const note: Note = {
          id: Math.random().toString(36).slice(2),
          author: CURRENT_USER.email,
          body,
          at: new Date().toISOString(),
          internal,
        };
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, notes: [...t.notes, note], updatedAt: new Date().toISOString() }
              : t,
          ),
        );
      },
    }),
    [tickets],
  );

  return <TicketContext.Provider value={value}>{children}</TicketContext.Provider>;
}

export function useTickets() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTickets must be used inside TicketProvider");
  return ctx;
}
