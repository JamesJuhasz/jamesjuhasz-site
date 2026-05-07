import { PostForm } from "../PostForm";

export default function NewNewsletterPage() {
  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">
        Newsletters
      </p>
      <h1 className="mt-2 mb-8 font-display text-h1 leading-tight">New issue</h1>
      <PostForm />
    </div>
  );
}
