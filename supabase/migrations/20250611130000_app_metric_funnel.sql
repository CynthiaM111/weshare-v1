-- Allow funnel events (search → book tap, etc.)

alter table public.app_metric_events
  drop constraint if exists app_metric_events_event_type_check;

alter table public.app_metric_events
  add constraint app_metric_events_event_type_check
  check (event_type in ('search', 'payment', 'error', 'funnel'));
