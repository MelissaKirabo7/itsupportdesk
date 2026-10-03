create table public.workstations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.workstations to authenticated;
grant all on public.workstations to service_role;
alter table public.workstations enable row level security;
create policy "workstations: readable" on public.workstations for select to authenticated using (true);
create policy "workstations: admin insert" on public.workstations for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "workstations: admin update" on public.workstations for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "workstations: admin delete" on public.workstations for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  note_id uuid references public.ticket_notes(id) on delete cascade,
  uploader_id uuid not null,
  path text not null,
  file_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert on public.ticket_attachments to authenticated;
grant all on public.ticket_attachments to service_role;
alter table public.ticket_attachments enable row level security;
create policy "attachments: visible with ticket" on public.ticket_attachments for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id and (t.requester_id = auth.uid() or public.is_staff(auth.uid()))));
create policy "attachments: participants add" on public.ticket_attachments for insert to authenticated
  with check (uploader_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id and (t.requester_id = auth.uid() or public.is_staff(auth.uid()))));

create table public.ticket_feedback (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets(id) on delete cascade,
  user_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.ticket_feedback to authenticated;
grant all on public.ticket_feedback to service_role;
alter table public.ticket_feedback enable row level security;
create policy "feedback: read own or staff" on public.ticket_feedback for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "feedback: requester insert" on public.ticket_feedback for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id and t.requester_id = auth.uid()));
create policy "feedback: own update" on public.ticket_feedback for update to authenticated using (user_id = auth.uid());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ticket_id uuid references public.tickets(id) on delete cascade,
  kind text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications: own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications: own update" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notifications: own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
alter publication supabase_realtime add table public.notifications;

alter table public.faq_articles add column show_in_panel boolean not null default true;
alter table public.faq_articles add column auto_generated boolean not null default false;
create policy "faq: staff delete" on public.faq_articles for delete to authenticated using (public.is_staff(auth.uid()));
create policy "faq: staff read all" on public.faq_articles for select to authenticated using (public.is_staff(auth.uid()));
grant delete on public.faq_articles to authenticated;

create policy "announcements: admin delete" on public.announcements for delete to authenticated using (public.has_role(auth.uid(),'admin'));
grant delete on public.announcements to authenticated;

create or replace function public.tickets_enforce_rbac()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if new.assignee_id is distinct from old.assignee_id then
    if not public.is_staff(auth.uid()) then
      raise exception 'Only IT technicians can claim or assign tickets';
    end if;
    if old.requester_id = auth.uid() then
      raise exception 'You cannot claim or assign a ticket you submitted';
    end if;
    if new.assignee_id is not null and new.assignee_id = old.requester_id then
      raise exception 'A ticket cannot be assigned to the person who submitted it';
    end if;
  end if;
  if old.requester_id = auth.uid() and (new.priority is distinct from old.priority
     or (new.status is distinct from old.status and new.status <> 'new')) then
    raise exception 'You cannot manage a ticket you submitted';
  end if;
  return new;
end; $$;
create trigger tickets_rbac before update on public.tickets for each row execute function public.tickets_enforce_rbac();

drop policy "notes: participants can add" on public.ticket_notes;
create policy "notes: participants can add" on public.ticket_notes for insert to authenticated
  with check (author_id = auth.uid() and (
    (public.is_staff(auth.uid()) and not exists (select 1 from public.tickets t where t.id = ticket_id and t.requester_id = auth.uid()))
    or (internal = false and exists (select 1 from public.tickets t where t.id = ticket_id and t.requester_id = auth.uid()))
  ));

create or replace function public.tickets_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is not null and new.assignee_id is distinct from old.assignee_id and new.assignee_id is distinct from auth.uid() then
    insert into public.notifications(user_id, ticket_id, kind, message)
    values (new.assignee_id, new.id, 'assigned', new.ref || ' was assigned to you: ' || new.title);
  end if;
  if new.status is distinct from old.status and new.requester_id is not null and new.requester_id is distinct from auth.uid() then
    insert into public.notifications(user_id, ticket_id, kind, message)
    values (new.requester_id, new.id, case when new.status = 'resolved' then 'resolved' else 'status' end,
      new.ref || ' is now ' || replace(new.status::text, '_', ' '));
  end if;
  return new;
end; $$;
create trigger tickets_notify after update on public.tickets for each row execute function public.tickets_notify();

create or replace function public.notes_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if new.internal then return new; end if;
  select id, ref, requester_id, assignee_id into t from public.tickets where id = new.ticket_id;
  if t.requester_id is not null and t.requester_id <> new.author_id then
    insert into public.notifications(user_id, ticket_id, kind, message)
    values (t.requester_id, t.id, 'message', 'New message from IT on ' || t.ref);
  elsif t.assignee_id is not null and t.assignee_id <> new.author_id then
    insert into public.notifications(user_id, ticket_id, kind, message)
    values (t.assignee_id, t.id, 'message', 'Requester replied on ' || t.ref);
  end if;
  return new;
end; $$;
create trigger notes_notify after insert on public.ticket_notes for each row execute function public.notes_notify();

create policy "ticket attachments: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ticket attachments: read" on storage.objects for select to authenticated using (bucket_id = 'ticket-attachments');