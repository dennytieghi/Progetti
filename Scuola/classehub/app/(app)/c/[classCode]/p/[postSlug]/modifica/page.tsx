import { notFound } from "next/navigation";
import { Banner } from "@/components/shared/Banner";
import { Card } from "@/components/ui/Card";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getPostBySlug } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { ModificaPostForm } from "./ModificaPostForm";

export const metadata = { title: `${it.modificaPost.titolo} — ${it.app.name}` };

/** Modifica di un post pubblicato: solo il rappresentante ci arriva. */
export default async function ModificaPostPage({
  params,
}: {
  params: Promise<{ classCode: string; postSlug: string }>;
}) {
  const { classCode, postSlug } = await params;
  const ctx = await requireRepresentative(classCode);

  const post = await getPostBySlug(ctx.klass.id, postSlug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">
          {it.modificaPost.titolo}: {it.postTypes[post.type]}
        </h1>
        <p className="mt-1 text-ink-soft">{it.modificaPost.spiega}</p>
      </div>

      {post.type === "poll" && <Banner tone="info">{it.modificaPost.sondaggioNota}</Banner>}

      <Card>
        <ModificaPostForm
          classCode={classCode}
          slug={post.slug}
          isDeadline={post.type === "deadline"}
          defaults={{
            title: post.title,
            body: post.body ?? "",
            dueDate: post.due_date ? post.due_date.slice(0, 10) : "",
          }}
        />
      </Card>
    </div>
  );
}
