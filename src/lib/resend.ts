/*
  Resend wrappers for newsletter sending and audience management.
  Mirrors src/lib/email.ts in shape: when keys are unset (dev/no-prod),
  log the intended action and return ok so calling flows still work.
*/
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM =
  process.env.RESEND_FROM_ADDRESS ?? "James <hello@jamesjuhasz.com>";
const OWNER_TO =
  process.env.CONTACT_TO_ADDRESS ?? "rjamesjuhasz@gmail.com";
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function getOwnerAddress(): string {
  return OWNER_TO;
}
export function getFromAddress(): string {
  return FROM;
}
export function getAudienceId(): string | undefined {
  return AUDIENCE_ID;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

export async function addContactToAudience(args: {
  email: string;
  firstName?: string;
  unsubscribed?: boolean;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const r = getClient();
  if (!r) {
    console.warn(
      `[resend] RESEND_API_KEY unset — would have added contact ${args.email}`,
    );
    return { ok: true };
  }
  if (!AUDIENCE_ID) {
    console.warn(
      "[resend] RESEND_AUDIENCE_ID unset — skipping audience add",
    );
    return { ok: true };
  }
  try {
    const { data, error } = await r.contacts.create({
      audienceId: AUDIENCE_ID,
      email: args.email,
      firstName: args.firstName,
      unsubscribed: args.unsubscribed ?? false,
    });
    if (error) {
      // Already-subscribed isn't really an error for our purposes.
      console.warn("[resend] contacts.create:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[resend] contacts.create threw:", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function listAudienceContacts(): Promise<
  Array<{ id: string; email: string; firstName?: string; createdAt?: string; unsubscribed?: boolean }>
> {
  const r = getClient();
  if (!r || !AUDIENCE_ID) return [];
  try {
    const { data, error } = await r.contacts.list({ audienceId: AUDIENCE_ID });
    if (error) {
      console.warn("[resend] contacts.list:", error);
      return [];
    }
    return (data?.data ?? []).map((c) => ({
      id: c.id,
      email: c.email,
      firstName: c.first_name ?? undefined,
      createdAt: c.created_at,
      unsubscribed: c.unsubscribed,
    }));
  } catch (err) {
    console.error("[resend] contacts.list threw:", err);
    return [];
  }
}

export async function sendTestEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const r = getClient();
  if (!r) {
    console.warn(
      `[resend] RESEND_API_KEY unset — would have sent test "${args.subject}" to ${args.to}`,
    );
    return { ok: true };
  }
  try {
    const { data, error } = await r.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createAndSendBroadcast(args: {
  subject: string;
  html: string;
  name?: string;
}): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const r = getClient();
  if (!r) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  if (!AUDIENCE_ID) {
    return { ok: false, error: "RESEND_AUDIENCE_ID not set" };
  }
  try {
    const created = await r.broadcasts.create({
      audienceId: AUDIENCE_ID,
      from: FROM,
      subject: args.subject,
      html: args.html,
      // Resend caps the broadcast `name` (an internal dashboard label only —
      // not the subject subscribers see) at 70 chars; longer values are
      // rejected. Titles over 70 chars would otherwise fail the whole send.
      name: args.name ? truncate(args.name, 70) : undefined,
    });
    if (created.error || !created.data?.id) {
      return {
        ok: false,
        error: created.error?.message ?? "no broadcast id returned",
      };
    }
    const sent = await r.broadcasts.send(created.data.id);
    if (sent.error) return { ok: false, error: sent.error.message };
    return { ok: true, id: created.data.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
