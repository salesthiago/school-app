import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonProgressBar,
  IonButton,
  IonAvatar,
  IonSkeletonText,
} from '@ionic/angular';
import type { RefresherCustomEvent } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { CoursesService } from '../../core/services/courses.service';
import { InstitutionsService } from '../../core/services/institutions.service';
import { Course, CourseModule, ModuleProgressSummary } from '../../core/models/academic.model';

interface EnrollmentView {
  module: CourseModule;
  course: Course;
  progress: ModuleProgressSummary;
}

interface RecommendedCourseView {
  course: Course;
  priceLabel: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonProgressBar,
    IonButton,
    IonAvatar,
    IonSkeletonText,
  ],
})
export class DashboardPage implements OnInit {
  loading = signal(true);
  inProgress = signal<EnrollmentView[]>([]);
  completed = signal<EnrollmentView[]>([]);
  recommended = signal<RecommendedCourseView[]>([]);
  studentBannerUrl = signal<string | undefined>(undefined);

  constructor(
    public authService: AuthService,
    private enrollmentsService: EnrollmentsService,
    private coursesService: CoursesService,
    private institutionsService: InstitutionsService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.load();
  }

  load(event?: RefresherCustomEvent) {
    this.institutionsService
      .getPublic()
      .subscribe((institution) => this.studentBannerUrl.set(institution.studentBannerUrl));

    this.enrollmentsService
      .myEnrollments()
      .pipe(
        switchMap((enrollments) => {
          const moduleEnrollments = enrollments.filter(
            (e): e is typeof e & { moduleId: CourseModule } => !!e.moduleId && typeof e.moduleId === 'object',
          );
          if (!moduleEnrollments.length) return of([] as EnrollmentView[]);
          const requests = moduleEnrollments.map((e) => {
            const module = e.moduleId;
            const course = e.courseId as Course;
            return this.enrollmentsService
              .moduleProgress(module.id)
              .pipe(switchMap((progress) => of({ module, course, progress })));
          });
          return forkJoin(requests);
        }),
      )
      .subscribe({
        next: (views) => {
          this.inProgress.set(views.filter((v) => v.progress.percentage < 100));
          this.completed.set(views.filter((v) => v.progress.percentage >= 100));
          this.loading.set(false);
          this.loadRecommended(new Set(views.map((v) => v.course.id)));
          event?.target.complete();
        },
        error: () => {
          this.loading.set(false);
          event?.target.complete();
        },
      });
  }

  get currentCourse(): EnrollmentView | undefined {
    return this.inProgress()[0];
  }

  get greetingName(): string {
    return this.authService.currentUser()?.name?.split(' ')[0] ?? '';
  }

  teacherName(course: Course): string {
    const teacher = course.teacherId as unknown;
    if (teacher && typeof teacher === 'object' && 'name' in teacher) {
      return (teacher as { name: string }).name;
    }
    return '';
  }

  initial(name: string | undefined): string {
    return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  }

  openModule(view: EnrollmentView) {
    const lessonId = view.progress.nextLessonId;
    if (lessonId) {
      this.router.navigate(['/student/aula', view.module.id, lessonId]);
    } else {
      this.router.navigate(['/student/cursos', view.course.id]);
    }
  }

  private loadRecommended(enrolledCourseIds: Set<string>) {
    this.coursesService.listPublished().subscribe((courses) => {
      const candidates = courses.filter((c) => !enrolledCourseIds.has(c.id)).slice(0, 4);
      if (!candidates.length) {
        this.recommended.set([]);
        return;
      }

      const requests = candidates.map((course) =>
        this.coursesService.listModules(course.id).pipe(
          map((modules) => ({ course, priceLabel: this.priceLabel(modules) })),
          catchError(() => of({ course, priceLabel: '' })),
        ),
      );
      forkJoin(requests).subscribe((views) => this.recommended.set(views));
    });
  }

  private priceLabel(modules: CourseModule[]): string {
    if (!modules.length) return '';
    if (modules.some((m) => m.free)) return 'Grátis';
    const min = Math.min(...modules.map((m) => m.price));
    return currencyFormatter.format(min);
  }
}
