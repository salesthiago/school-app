export interface Institution {
  id: string;
  name: string;
  logoUrl?: string;
  studentBannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  teacherId: string | { id: string; name: string };
  published: boolean;
  /** Preço da trilha de aulas avulsas do curso (aulas sem módulo). */
  bundlePrice?: number;
  /** Trilha de aulas avulsas gratuita — ver bundlePrice. */
  free?: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  courseId: string;
  order: number;
  price: number;
  free: boolean;
  published: boolean;
  workloadHours: number;
}

export interface VideoMeta {
  provider: string;
  externalId: string;
  playbackUrl?: string;
  durationSeconds: number;
  thumbnailUrl?: string;
  status?: 'processing' | 'ready' | 'error';
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  /** Ausente quando a aula é avulsa (direto no curso, sem módulo). */
  moduleId?: string;
  video?: VideoMeta;
  order: number;
  mandatory: boolean;
  published: boolean;
}

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  /** Ausente/null quando a matrícula é na trilha de aulas avulsas do curso, não num módulo. */
  moduleId: CourseModule | string | null;
  courseId: Course | string;
  status: 'active' | 'revoked';
}

export interface ModuleProgressSummary {
  totalMandatoryLessons: number;
  completedLessons: number;
  percentage: number;
  nextLessonId: string | null;
  completedLessonIds: string[];
  examWeightPercent: number;
  examPassed: boolean | null;
}

export function enrollmentModuleId(e: Enrollment): string | null {
  if (!e.moduleId) return null;
  return typeof e.moduleId === 'string' ? e.moduleId : e.moduleId.id;
}

export function enrollmentCourseId(e: Enrollment): string {
  return typeof e.courseId === 'string' ? e.courseId : e.courseId.id;
}

export interface Certificate {
  id: string;
  code: string;
  studentName: string;
  moduleTitle: string;
  teacherName: string;
  workloadHours: number;
  issuedAt: string;
}
