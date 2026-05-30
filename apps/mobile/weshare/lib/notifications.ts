import { supabase } from './supabase';

/**
 * In-app notifications.
 *
 * Requires a `notifications` table in Supabase. Run this once in the SQL editor:
 *
 *   create table if not exists public.notifications (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid not null references auth.users (id) on delete cascade,
 *     type text not null,
 *     title text not null,
 *     message text not null,
 *     read boolean not null default false,
 *     ride_id uuid references public.rides (id) on delete set null,
 *     booking_id uuid references public.bookings (id) on delete set null,
 *     created_at timestamptz not null default now()
 *   );
 *   create index if not exists notifications_user_idx
 *     on public.notifications (user_id, created_at desc);
 *
 *   alter table public.notifications enable row level security;
 *   create policy "own notifications - select"
 *     on public.notifications for select using (auth.uid() = user_id);
 *   create policy "own notifications - update"
 *     on public.notifications for update using (auth.uid() = user_id);
 *   -- Inserts come from the client on behalf of other users (e.g. a passenger
 *   -- booking notifies the driver), so allow authenticated inserts:
 *   create policy "insert notifications"
 *     on public.notifications for insert with check (auth.role() = 'authenticated');
 */

export type NotificationType =
  | 'new_booking'
  | 'booking_pending'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'ride_cancelled'
  | 'ride_completed';

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  read: boolean;
  rideId: string | null;
  bookingId: string | null;
  createdAt: string;
};

function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read ?? false,
    rideId: row.ride_id ?? null,
    bookingId: row.booking_id ?? null,
    createdAt: row.created_at,
  };
}

/** Inserts a notification row. Returns the created notification, or null on failure. */
export async function createNotification(
  userId: string,
  type: NotificationType | string,
  title: string,
  message: string,
  rideId?: string,
  bookingId?: string
): Promise<Notification | null> {
  const { error } = await supabase.rpc('insert_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_ride_id: rideId ?? null,
    p_booking_id: bookingId ?? null,
  });

  if (error) return null;
  return null;
}

/** All notifications for a user, newest first. */
export async function listNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToNotification);
}

/** Marks a single notification as read. */
export async function markAsRead(notificationId: string): Promise<string | null> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  return error ? error.message : null;
}

/** Marks every unread notification for a user as read. */
export async function markAllAsRead(userId: string): Promise<string | null> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  return error ? error.message : null;
}

/** Count of unread notifications for a user. */
export async function getUnreadCount(userId: string): Promise<number> {
  // `head: true` returns only the count without fetching any rows.
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
}
