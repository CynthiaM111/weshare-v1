import Constants from 'expo-constants';

import { supabase } from './supabase';

type MetricEventType = 'search' | 'payment' | 'error' | 'funnel';

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
}

async function logMetric(
  eventType: MetricEventType,
  payload: Record<string, unknown>,
  options?: { userId?: string | null; success?: boolean; durationMs?: number }
): Promise<void> {
  try {
    await supabase.from('app_metric_events').insert({
      event_type: eventType,
      user_id: options?.userId ?? null,
      success: options?.success ?? true,
      duration_ms: options?.durationMs ?? null,
      payload: { app_version: getAppVersion(), ...payload },
    });
  } catch {
    // Never block UX for analytics.
  }
}

export function logSearchMetric(params: {
  fromQuery: string;
  toQuery: string;
  resultCount: number;
  durationMs: number;
  userId?: string | null;
  errorMessage?: string;
}): void {
  void logMetric(
    'search',
    {
      from_query: params.fromQuery,
      to_query: params.toQuery,
      result_count: params.resultCount,
      error_message: params.errorMessage ?? null,
    },
    {
      userId: params.userId,
      success: !params.errorMessage,
      durationMs: params.durationMs,
    }
  );
}

export function logBookTapMetric(params: {
  rideId: string;
  fromQuery?: string;
  toQuery?: string;
  resultCount?: number;
  userId?: string | null;
}): void {
  void logMetric(
    'funnel',
    {
      step: 'book_tap',
      ride_id: params.rideId,
      from_query: params.fromQuery ?? null,
      to_query: params.toQuery ?? null,
      result_count: params.resultCount ?? null,
    },
    { userId: params.userId, success: true }
  );
}

export function logPaymentMetric(params: {
  phase: 'initiated' | 'completed' | 'failed' | 'timeout';
  bookingId?: string;
  depositId?: string;
  network?: string;
  amountRwf?: number;
  durationMs?: number;
  userId?: string | null;
  errorMessage?: string;
}): void {
  void logMetric(
    'payment',
    {
      phase: params.phase,
      booking_id: params.bookingId ?? null,
      deposit_id: params.depositId ?? null,
      network: params.network ?? null,
      amount_rwf: params.amountRwf ?? null,
      error_message: params.errorMessage ?? null,
    },
    {
      userId: params.userId,
      success: params.phase === 'completed',
      durationMs: params.durationMs,
    }
  );
}

export function logAppError(params: {
  context: string;
  message: string;
  userId?: string | null;
}): void {
  void logMetric(
    'error',
    { context: params.context, message: params.message },
    { userId: params.userId, success: false }
  );
}
