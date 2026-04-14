import { Link } from "react-router-dom";

type SubjectCardData = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  courseCount?: number;
  curriculum_count?: number;
};

export default function SubjectCard({ subject, index }: { subject: SubjectCardData; index: number }) {
  const count = subject.courseCount ?? subject.curriculum_count ?? 0;
  return (
    <Link
      to={`/subjects/${subject.id}`}
      className="group block opacity-0 animate-fade-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "forwards" }}
    >
      <div className="relative flex min-h-[210px] flex-col overflow-hidden rounded-2xl bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
        <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${subject.color || "bg-primary"} opacity-10 transition-transform duration-300 group-hover:scale-150`} />
        <div>
          <span className="text-3xl">{subject.icon || "📚"}</span>
          <h3 className="mt-4 font-heading text-lg font-bold">{subject.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subject.description || "Môn học"}</p>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {count} giáo trình
          </span>
        </div>
      </div>
    </Link>
  );
}
