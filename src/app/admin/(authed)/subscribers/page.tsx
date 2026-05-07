import { listAudienceContacts, getAudienceId } from "@/lib/resend";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const contacts = await listAudienceContacts();
  const audienceId = getAudienceId();
  const active = contacts.filter((c) => !c.unsubscribed);

  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">Subscribers</p>
      <h1 className="mt-2 mb-2 font-display text-h1 leading-tight">
        Resend audience
      </h1>
      <p className="text-body text-ink-3">
        {audienceId
          ? `Connected to audience ${audienceId.slice(0, 8)}…`
          : "RESEND_AUDIENCE_ID not set — subscribers will not be added to a Resend audience."}
      </p>

      <div className="mt-8 grid grid-cols-3 gap-6 max-w-md">
        <Stat label="Active" value={active.length} />
        <Stat label="Unsubscribed" value={contacts.length - active.length} />
        <Stat label="Total" value={contacts.length} />
      </div>

      {contacts.length === 0 ? (
        <p className="mt-10 text-body text-ink-3">
          No contacts yet (or RESEND_API_KEY/RESEND_AUDIENCE_ID is not set).
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {contacts.slice(0, 200).map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-12 items-center gap-4 py-3"
            >
              <div className="col-span-12 md:col-span-6 truncate text-body">
                {c.email}
              </div>
              <div className="col-span-6 md:col-span-3 text-caption text-ink-3">
                {c.firstName ?? ""}
              </div>
              <div className="col-span-3 md:col-span-2 text-caption text-ink-3">
                {c.createdAt
                  ? new Date(c.createdAt).toLocaleDateString("en-CA")
                  : ""}
              </div>
              <div className="col-span-3 md:col-span-1 text-caption uppercase tracking-wider">
                {c.unsubscribed ? (
                  <span className="text-red-700">off</span>
                ) : (
                  <span className="text-green-700">on</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-h2 leading-none">{value}</p>
      <p className="mt-1 text-caption uppercase tracking-wider text-ink-3">
        {label}
      </p>
    </div>
  );
}
