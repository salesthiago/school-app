import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { of, switchMap } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonProgressBar,
  IonBadge,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, listOutline, documentTextOutline, chevronForwardOutline } from 'ionicons/icons';
import { CoursesService } from '../../core/services/courses.service';
import { LessonsService } from '../../core/services/lessons.service';
import { AttachmentsService } from '../../core/services/attachments.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { CompletionService } from '../../core/services/completion.service';
import { VideoFullscreenService } from '../../core/services/video-fullscreen.service';
import { Attachment, Course, CourseModule, Lesson, ModuleProgressSummary } from '../../core/models/academic.model';

type ContentTab = 'sobre' | 'materiais';
const PROGRESS_SYNC_INTERVAL_MS = 10000;

interface PlayerJsPlayer {
  on(event: string, callback: (data: unknown) => void): void;
  setCurrentTime(seconds: number): void;
}
declare global {
  interface Window {
    playerjs?: { Player: new (target: HTMLIFrameElement) => PlayerJsPlayer };
  }
}

/** Carrega o player.js do Bunny (protocolo postMessage do embed) uma vez por sessão de página. */
let playerJsLoadPromise: Promise<void> | null = null;
function loadPlayerJs(): Promise<void> {
  if (window.playerjs) return Promise.resolve();
  if (playerJsLoadPromise) return playerJsLoadPromise;
  playerJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '//assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar player.js'));
    document.head.appendChild(script);
  });
  return playerJsLoadPromise;
}

@Component({
  selector: 'app-course-player',
  standalone: true,
  templateUrl: './course-player.page.html',
  styleUrl: './course-player.page.scss',
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonProgressBar,
    IonBadge,
  ],
})
export class CoursePlayerPage implements OnInit, OnDestroy {
  course = signal<Course | null>(null);
  /** Nulo quando o player está tocando uma aula avulsa (sem módulo). */
  module = signal<CourseModule | null>(null);
  courseId = '';

  lessons = signal<Lesson[]>([]);
  currentLesson = signal<Lesson | null>(null);
  progress = signal<ModuleProgressSummary | null>(null);
  attachments = signal<Attachment[]>([]);

  activeTab = signal<ContentTab>('sobre');
  showLessonList = signal(false);

  statusLabel = computed(() => {
    const p = this.progress();
    if (!p || p.percentage === 0) return 'Não iniciado';
    if (p.percentage >= 100) return 'Concluído';
    return 'Em andamento';
  });

  hasNextLesson = computed(() => {
    const current = this.currentLesson();
    const list = this.lessons();
    if (!current) return false;
    const idx = list.findIndex((l) => l.id === current.id);
    return idx >= 0 && idx < list.length - 1;
  });

  /** Memoizado por aula pra não reiniciar o iframe a cada change detection. */
  videoUrl = computed<SafeResourceUrl | null>(() => {
    const playbackUrl = this.currentLesson()?.video?.playbackUrl;
    return playbackUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(playbackUrl) : null;
  });

  private lastSyncedAt = 0;
  private lastKnownSeconds = 0;
  private currentLessonDuration = 0;
  private resumeSeconds = 0;

  constructor(
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private lessonsService: LessonsService,
    private attachmentsService: AttachmentsService,
    private enrollmentsService: EnrollmentsService,
    private completionService: CompletionService,
    private sanitizer: DomSanitizer,
    private videoFullscreen: VideoFullscreenService,
  ) {
    addIcons({ checkmarkCircle, listOutline, documentTextOutline, chevronForwardOutline });
  }

  ngOnInit() {
    this.videoFullscreen.start();
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const moduleId = params.get('moduleId');
          const paramCourseId = params.get('courseId');

          if (moduleId) {
            return this.coursesService.getModule(moduleId);
          }

          this.courseId = paramCourseId!;
          this.module.set(null);
          this.coursesService.getCourse(this.courseId).subscribe((course) => this.course.set(course));
          this.lessonsService.listByCourse(this.courseId).subscribe((lessons) => this.selectLessonFromRoute(lessons));
          this.refreshCourseTrackProgress(this.courseId);
          return of(null);
        }),
      )
      .subscribe((module) => {
        if (!module) return;
        this.module.set(module);
        this.courseId = module.courseId;
        this.coursesService.getCourse(module.courseId).subscribe((course) => this.course.set(course));
        this.coursesService.listLessons(module.id).subscribe((lessons) => this.selectLessonFromRoute(lessons));
        this.refreshModuleProgress(module.id);
      });
  }

  private selectLessonFromRoute(lessons: Lesson[]) {
    this.lessons.set(lessons);
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    const selected = lessons.find((l) => l.id === lessonId) ?? lessons[0] ?? null;
    this.currentLesson.set(selected);
    if (selected) this.onLessonSelected(selected);
  }

  private onLessonSelected(lesson: Lesson) {
    this.activeTab.set('sobre');
    this.resumeSeconds = 0;
    this.attachmentsService.listByLesson(lesson.id).subscribe((attachments) => this.attachments.set(attachments));
    this.enrollmentsService.lessonProgress(lesson.id).subscribe((p) => (this.resumeSeconds = p.watchedSeconds));
  }

  private refreshModuleProgress(moduleId: string) {
    this.enrollmentsService.moduleProgress(moduleId).subscribe((p) => {
      this.progress.set(p);
      if (p.percentage >= 100) {
        this.completionService.checkModule(moduleId).subscribe();
      }
    });
  }

  private refreshCourseTrackProgress(courseId: string) {
    this.enrollmentsService.courseTrackProgress(courseId).subscribe((p) => {
      this.progress.set(p);
      if (p.percentage >= 100) {
        this.completionService.checkCourseTrack(courseId).subscribe();
      }
    });
  }

  ngOnDestroy() {
    this.videoFullscreen.stop();
  }

  attachPlayer(iframeEl: HTMLIFrameElement) {
    this.lastSyncedAt = 0;
    this.lastKnownSeconds = 0;
    this.currentLessonDuration = 0;

    loadPlayerJs()
      .then(() => {
        const PlayerCtor = window.playerjs?.Player;
        if (!PlayerCtor) return;
        const player = new PlayerCtor(iframeEl);

        player.on('ready', () => {
          if (this.resumeSeconds > 5) player.setCurrentTime(this.resumeSeconds);
        });

        player.on('timeupdate', (raw) => {
          const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as
            | { seconds?: number; duration?: number }
            | undefined;
          if (typeof data?.seconds !== 'number') return;
          this.lastKnownSeconds = data.seconds;
          if (typeof data.duration === 'number' && data.duration > 0) {
            this.currentLessonDuration = data.duration;
          }
          const now = Date.now();
          if (now - this.lastSyncedAt >= PROGRESS_SYNC_INTERVAL_MS) {
            this.lastSyncedAt = now;
            this.syncProgress(this.lastKnownSeconds);
          }
        });

        player.on('ended', () => {
          this.syncProgress(this.currentLessonDuration || this.lastKnownSeconds);
        });
      })
      .catch(() => {
        // Sem player.js o rastreio automático fica desligado; "Marcar como concluída" ainda funciona.
      });
  }

  private syncProgress(seconds: number) {
    const lesson = this.currentLesson();
    if (!lesson || seconds <= 0) return;
    const module = this.module();
    this.enrollmentsService.recordProgress(lesson.id, Math.round(seconds), module?.id).subscribe({
      next: () => {
        if (module) {
          this.refreshModuleProgress(module.id);
        } else {
          this.refreshCourseTrackProgress(this.courseId);
        }
      },
    });
  }

  setTab(tab: ContentTab) {
    this.activeTab.set(tab);
  }

  toggleLessonList() {
    this.showLessonList.update((v) => !v);
  }

  isLessonCompleted(lessonId: string): boolean {
    return this.progress()?.completedLessonIds?.includes(lessonId) ?? false;
  }

  selectLesson(lesson: Lesson) {
    this.currentLesson.set(lesson);
    this.onLessonSelected(lesson);
    this.showLessonList.set(false);
  }

  nextLesson() {
    const current = this.currentLesson();
    const list = this.lessons();
    if (!current) return;
    const idx = list.findIndex((l) => l.id === current.id);
    if (idx >= 0 && idx < list.length - 1) {
      this.selectLesson(list[idx + 1]);
    }
  }

  markWatched() {
    const lesson = this.currentLesson();
    if (!lesson) return;
    this.syncProgress(lesson.video?.durationSeconds ?? 0);
  }

  /** Descrições de aula/curso vêm do editor Quill do professor (HTML), não texto puro. */
  safeHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }

  teacherName(): string {
    const teacher = this.course()?.teacherId as unknown;
    if (teacher && typeof teacher === 'object' && 'name' in teacher) {
      return (teacher as { name: string }).name;
    }
    return '';
  }

  formatDuration(seconds: number | undefined): string {
    if (!seconds) return '—';
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours}h ${rest}min` : `${minutes} min`;
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
