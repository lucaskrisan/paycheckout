import { memo } from "react";
import { CheckCircle2, Circle, FileText, Link2, Download, Video, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import LessonMaterials from "./LessonMaterials";
import LessonReviews from "./LessonReviews";

const contentTypeIcons: Record<string, typeof FileText> = {
  text: FileText,
  link: Link2,
  pdf: Download,
  video_embed: Video,
  html: BookOpen,
};

const contentTypeLabels: Record<string, string> = {
  text: "Texto",
  link: "Link Externo",
  pdf: "Arquivo PDF",
  video_embed: "Vídeo",
  html: "Conteúdo Interativo",
};

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  content: string | null;
  file_url: string | null;
  sort_order: number;
}

interface Props {
  lesson: Lesson;
  isCompleted: boolean;
  onToggleComplete: (lessonId: string) => void;
  accessId: string;
  customerName: string;
  tokenClient: any;
}

const MemberLessonViewer = memo(function MemberLessonViewer({
  lesson,
  isCompleted,
  onToggleComplete,
  accessId,
  customerName,
  tokenClient,
}: Props) {
  return (
    <motion.div
      key={lesson.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "hsl(220 18% 10%)",
          borderColor: "hsl(220 15% 14%)",
        }}
      >
        {/* Video content first */}
        {lesson.content_type === "video_embed" && lesson.content && (
          <div className="w-full" style={{ background: "hsl(220,20%,4%)" }}>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={lesson.content}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                style={{ border: 0 }}
              />
            </div>
          </div>
        )}

        {/* Lesson Header */}
        <div
          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b"
          style={{ borderColor: "hsl(220 15% 14%)" }}
        >
          <div className="min-w-0">
            <h2 className="text-white font-bold text-base sm:text-xl truncate">{lesson.title}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{
                  background: "hsl(220,18%,16%)",
                  color: "hsl(220,10%,55%)",
                }}
              >
                {(() => {
                  const Icon = contentTypeIcons[lesson.content_type] || FileText;
                  return <Icon className="w-3 h-3" />;
                })()}
                {contentTypeLabels[lesson.content_type] || lesson.content_type}
              </span>
            </div>
          </div>
          <button
            onClick={() => onToggleComplete(lesson.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap hover:scale-[1.02] self-start sm:self-auto"
            style={{
              background: isCompleted ? "hsl(145,65%,42%)" : "hsl(220,18%,16%)",
              color: isCompleted ? "white" : "hsl(0,0%,60%)",
            }}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Concluída
              </>
            ) : (
              <>
                <Circle className="w-4 h-4" />
                Concluída
              </>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {lesson.content_type === "text" && lesson.content && (
            <div
              className="prose prose-invert prose-sm max-w-none"
              style={{ color: "hsl(0,0%,80%)" }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content) }}
            />
          )}
          {lesson.content_type === "html" && lesson.content && (
            <div
              className="prose prose-invert prose-sm max-w-none"
              style={{ color: "hsl(0,0%,80%)" }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content) }}
            />
          )}
          {lesson.content_type === "link" && lesson.content && (
            <a
              href={lesson.content}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{
                backgroundImage: "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))",
                color: "white",
              }}
            >
              <Link2 className="w-4 h-4" />
              Acessar Link
            </a>
          )}
          {lesson.content_type === "pdf" && lesson.file_url && (
            <div className="space-y-4">
              <a
                href={lesson.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{
                  backgroundImage: "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))",
                  color: "white",
                }}
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Materials */}
      <div className="mt-4">
        <LessonMaterials lessonId={lesson.id} client={tokenClient} />
      </div>

      {/* Reviews */}
      <div className="mt-4">
        <LessonReviews
          lessonId={lesson.id}
          memberAccessId={accessId}
          customerName={customerName}
          client={tokenClient}
        />
      </div>
    </motion.div>
  );
});

export default MemberLessonViewer;
