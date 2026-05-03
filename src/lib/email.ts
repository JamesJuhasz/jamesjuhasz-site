/*
  Resend wrapper. When RESEND_API_KEY is unset (dev / pre-launch), logs to
  the console instead of sending — so form handlers always succeed in dev
  without exposing keys.
*/

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM =
  process.env.RESEND_FROM_ADDRESS ?? "James <hello@jamesjuhasz.com>";
const TO =
  process.env.CONTACT_TO_ADDRESS ?? "rjamesjuhasz@gmail.com";

const resend = apiKey ? new Resend(apiKey) : null;

export type SendArgs = {
  subject: string;
  text: string;
  replyTo?: string;
  to?: string;
};

export async function sendEmail({ subject, text, replyTo, to }: SendArgs): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — would have sent:\n  to: ${to ?? TO}\n  reply-to: ${replyTo ?? "—"}\n  subject: ${subject}\n  body:\n${text}`,
    );
    return { ok: true };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: to ?? TO,
      subject,
      text,
      replyTo,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
