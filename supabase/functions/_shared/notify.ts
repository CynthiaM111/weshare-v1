import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  rideId?: string | null;
  bookingId?: string | null;
};

/** In-app row plus a device push, so the alert arrives with the app closed. */
export async function notifyUser(supabase: SupabaseClient, input: NotifyInput): Promise<void> {
  const { error } = await supabase.rpc("insert_notification", {
    p_user_id: input.userId,
    p_type: input.type,
    p_title: input.title,
    p_message: input.message,
    p_ride_id: input.rideId ?? null,
    p_booking_id: input.bookingId ?? null,
  });
  if (error) return;

  try {
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", input.userId);

    const to = (tokens ?? []).map((row) => row.token).filter(Boolean);
    if (to.length === 0) return;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        to.map((token) => ({
          to: token,
          title: input.title,
          body: input.message,
          sound: "default",
          data: {
            type: input.type,
            rideId: input.rideId ?? null,
            bookingId: input.bookingId ?? null,
          },
        })),
      ),
    });
  } catch {
    // The in-app notification is already stored.
  }
}
