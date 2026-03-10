import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

const Courses = () => (
  <div className="space-y-6">
    <h1 className="font-display text-2xl font-bold text-foreground">Cursos</h1>
    <Card>
      <CardContent className="py-12 text-center">
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Em breve: gerencie cursos, módulos e aulas entregues aos seus clientes.</p>
      </CardContent>
    </Card>
  </div>
);

export default Courses;
