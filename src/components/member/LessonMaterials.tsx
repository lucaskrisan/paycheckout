import { useEffect, useState } from "react";
import { Download, FileText, Link2, Video, File } from "lucide-react";
import { motion } from "framer-motion";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  material_type: string;
}

const materialIcons: Record<string, typeof FileText> = {
  file: File,
  pdf: FileText,
  link: Link2,
  video: Video,
};

export default function LessonMaterials({
  lessonId,
  client,
}: {
  lessonId: string;
  client: SupabaseClient;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    client
      .from("lesson_materials")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("sort_order")
      .then(({ data }) => setMaterials(data || []));
  }, [lessonId]);

  if (materials.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border p-5"
      style={{
        background: "hsl(220 18% 10%)",
        borderColor: "hsl(220 15% 14%)",
      }}
    >
      <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
        <Download className="w-4 h-4 text-[hsl(145,65%,50%)]" />
        Material Complementar
      </h3>
      <div className="space-y-2">
        {materials.map((m) => {
          const Icon = materialIcons[m.material_type] || File;
          return (
            <a
              key={m.id}
              href={m.file_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01]"
              style={{ background: "hsl(220,18%,14%)" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(220,18%,18%)" }}
              >
                <Icon className="w-4 h-4 text-[hsl(145,65%,50%)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{m.title}</p>
                {m.description && (
                  <p className="text-[hsl(220,10%,45%)] text-xs truncate">{m.description}</p>
                )}
              </div>
              <Download className="w-4 h-4 text-[hsl(220,10%,40%)] flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </motion.div>
  );
}
