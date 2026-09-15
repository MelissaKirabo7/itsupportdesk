-- Enums
create type public.app_role as enum ('submitter','technician','admin');
create type public.ticket_status as enum ('new','in_progress','pending','resolved','closed');
create type public.ticket_priority as enum ('low','medium','high','critical');

-- Profiles
create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text not null default '',
  department text not null default '',
  workstation text not null default '',
  location text not null default '',
  on_leave boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('technician','admin'))
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- Bootstrap role assignment: first ever user becomes admin, everyone else a submitter
create or replace function public.bootstrap_role()
returns app_role language plpgsql security definer set search_path = public as $$
declare assigned app_role;
begin
  select role into assigned from public.user_roles where user_id = auth.uid() limit 1;
  if assigned is not null then return assigned; end if;
  if not exists (select 1 from public.user_roles where role = 'admin') then
    assigned := 'admin';
  else
    assigned := 'submitter';
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), assigned)
    on conflict do nothing;
  return assigned;
end;
$$;

-- Tickets
create sequence public.ticket_ref_seq start 4200;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('RC-' || nextval('public.ticket_ref_seq')),
  title text not null,
  description text not null,
  requester_id uuid,
  requester_email text not null,
  location text not null default '',
  department text not null default '',
  workstation text not null default '',
  category text not null,
  priority ticket_priority not null default 'medium',
  status ticket_status not null default 'new',
  assignee_id uuid,
  assignee_email text,
  resolution_notes text,
  satisfaction int,
  parent_ticket_id uuid references public.tickets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sla_due_at timestamptz not null default now() + interval '8 hours',
  pending_since timestamptz,
  resolved_at timestamptz,
  reopened_at timestamptz
);
grant select, insert, update on public.tickets to authenticated;
grant all on public.tickets to service_role;
alter table public.tickets enable row level security;

create policy "tickets: staff read all, users read own" on public.tickets
  for select to authenticated
  using (requester_id = auth.uid() or public.is_staff(auth.uid()));
create policy "tickets: users create own" on public.tickets
  for insert to authenticated with check (requester_id = auth.uid());
create policy "tickets: staff update any, users update own" on public.tickets
  for update to authenticated
  using (public.is_staff(auth.uid()) or requester_id = auth.uid());

-- Keep SLA + timestamps consistent
create or replace function public.tickets_apply_rules()
returns trigger language plpgsql set search_path = public as $$
declare hours int;
begin
  hours := case new.priority when 'critical' then 2 when 'high' then 4 when 'medium' then 8 else 24 end;
  if tg_op = 'INSERT' then
    new.sla_due_at := new.created_at + make_interval(hours => hours);
    return new;
  end if;
  new.updated_at := now();
  if new.priority is distinct from old.priority then
    new.sla_due_at := new.created_at + make_interval(hours => hours);
  end if;
  if new.status = 'pending' and old.status is distinct from 'pending' then
    new.pending_since := now();
  elsif new.status <> 'pending' then
    new.pending_since := null;
  end if;
  if new.status in ('resolved','closed') and old.status not in ('resolved','closed') then
    if new.resolution_notes is null or length(btrim(new.resolution_notes)) < 10 then
      raise exception 'Resolution notes are required before resolving a ticket';
    end if;
    new.resolved_at := now();
  end if;
  if new.status not in ('resolved','closed') and old.status in ('resolved','closed') then
    new.resolved_at := null;
    new.reopened_at := now();
  end if;
  return new;
end;
$$;
create trigger tickets_rules before insert or update on public.tickets
  for each row execute function public.tickets_apply_rules();

-- Notes / work log
create table public.ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid,
  author_email text not null,
  body text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert on public.ticket_notes to authenticated;
grant all on public.ticket_notes to service_role;
alter table public.ticket_notes enable row level security;
create policy "notes: visible per role" on public.ticket_notes
  for select to authenticated
  using (
    public.is_staff(auth.uid())
    or (internal = false and exists (select 1 from public.tickets t where t.id = ticket_id and t.requester_id = auth.uid()))
  );
create policy "notes: participants can add" on public.ticket_notes
  for insert to authenticated
  with check (
    author_id = auth.uid() and (
      public.is_staff(auth.uid())
      or (internal = false and exists (select 1 from public.tickets t where t.id = ticket_id and t.requester_id = auth.uid()))
    )
  );

-- Canned responses
create table public.canned_responses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
grant select on public.canned_responses to authenticated;
grant all on public.canned_responses to service_role;
alter table public.canned_responses enable row level security;
create policy "canned: staff read" on public.canned_responses for select to authenticated using (public.is_staff(auth.uid()));

-- FAQ / knowledge base
create table public.faq_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'General',
  published boolean not null default true,
  source_ticket_id uuid references public.tickets(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.faq_articles to authenticated;
grant insert, update on public.faq_articles to authenticated;
grant all on public.faq_articles to service_role;
alter table public.faq_articles enable row level security;
create policy "faq: readable" on public.faq_articles for select to authenticated using (true);
create policy "faq: staff write" on public.faq_articles for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "faq: staff update" on public.faq_articles for update to authenticated using (public.is_staff(auth.uid()));

-- Outage announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.announcements to authenticated;
grant insert, update on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy "announcements: readable" on public.announcements for select to authenticated using (true);
create policy "announcements: admin write" on public.announcements for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "announcements: admin update" on public.announcements for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- Seed demo content
insert into public.canned_responses (title, body) values
  ('Ask for a screenshot','Thanks for reporting this. Could you attach a screenshot of the exact error message so we can pinpoint the cause?'),
  ('Restart and retry','Please restart the machine, sign back in and try again. Let us know whether the issue persists.'),
  ('Parts on order','We have ordered the replacement part. The ticket will stay pending until it arrives, and we will schedule a swap right away.'),
  ('Resolved confirmation','We believe this is now fixed. The ticket will close automatically unless you tell us otherwise.');

insert into public.faq_articles (title, body, category) values
  ('Printer will not power on','Check the wall switch and the power cable at both ends, then hold the power button for 10 seconds. If there is still no light, the fuse in the plug is the usual cause.','Printing'),
  ('Wi-Fi keeps dropping','Forget the corporate network on your device, reconnect and confirm you are on the 5GHz band. Persistent drops in one room usually mean access point saturation.','Network/Wi-Fi'),
  ('Outlook asks for my password repeatedly','Sign out of Office completely, clear the stored credential in Credential Manager, then sign back in with your corporate email.','Access/Passwords'),
  ('Second monitor is not detected','Unplug the dock, wait 10 seconds and reconnect. Then press Windows+P and choose Extend. Docks only drive two displays when DisplayLink drivers are current.','Peripherals'),
  ('Laptop will not start','Hold the power button for 15 seconds, plug into a known-good charger and look for a charging LED. No LED means the ticket needs a hardware swap.','Hardware');

insert into public.tickets (title, description, requester_email, location, department, workstation, category, priority, status, created_at)
values
  ('Laptop will not power on after weekend','Staff laptop is completely dead, no charging LED.','aisha.bello@vicacademy.org','Block B · Room 214','Faculty','VIC-2141','Hardware','critical','new', now() - interval '3 hours'),
  ('Cannot reach shared drive from meeting room 3','Shared drive mapping fails with a network path error in meeting room 3 only.','stephen.john@vicacademy.org','Block A · Meeting Room 3','Operations','VIC-1003','Network/Wi-Fi','high','new', now() - interval '6 hours'),
  ('ERP client crashes when exporting to Excel','Export to Excel closes the ERP client with no error message.','aisha.bello@vicacademy.org','Block B · Room 214','Finance','VIC-2141','Software','high','new', now() - interval '20 hours'),
  ('Outlook keeps asking for password every hour','Credential prompt reappears roughly every hour on the desktop client.','emily.cross@vicacademy.org','Block C · Room 110','Admissions','VIC-3110','Access/Passwords','medium','new', now() - interval '2 days'),
  ('Finance floor printer jams on every duplex job','Duplex jobs jam at the rear tray; simplex prints fine. Waiting on parts.','james.liu@vicacademy.org','Block B · Print Bay','Finance','VIC-2200','Printing','medium','new', now() - interval '4 days'),
  ('Second monitor not detected on new dock','New dock only drives one external display; second monitor stays black.','nkem.adeyemi@vicacademy.org','Block A · Room 305','Faculty','VIC-1305','Peripherals','low','new', now() - interval '5 days');