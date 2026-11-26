-- Attendance late tracking (-2 pts/min on admin approval) and AM/PM direct admin mark-present.
alter table public.attendance
  add column if not exists late_minutes int not null default 0 check (late_minutes >= 0),
  add column if not exists points_deducted int not null default 0 check (points_deducted >= 0);

alter table public.attendance_manual
  add column if not exists period text not null default 'FULL' check (period in ('FULL', 'AM', 'PM'));

alter table public.attendance_manual drop constraint if exists attendance_manual_pkey;
alter table public.attendance_manual add primary key (user_id, date, period);

notify pgrst, 'reload schema';
