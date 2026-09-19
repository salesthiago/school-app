import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardContent,
  IonProgressBar,
  IonAvatar,
} from '@ionic/angular';
import type { RefresherCustomEvent } from '@ionic/angular';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import {
  Course,
  CourseModule,
  Enrollment,
  ModuleProgressSummary,
  enrollmentCourseId,
  enrollmentModuleId,
} from '../../core/models/academic.model';

interface MyCourseView {
  key: string;
  course: Course;
  subtitle: string;
  progress: ModuleProgressSummary;
  continueLink: unknown[];
}

@Component({
  selector: 'app-my-courses',
  standalone: true,
  templateUrl: './my-courses.page.html',
  styleUrl: './my-courses.page.scss',
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardContent,
    IonProgressBar,
    IonAvatar,
  ],
})
export class MyCoursesPage implements OnInit {
  loading = signal(true);
  inProgress = signal<MyCourseView[]>([]);
  completed = signal<MyCourseView[]>([]);

  constructor(
    private enrollmentsService: EnrollmentsService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.load();
  }

  load(event?: RefresherCustomEvent) {
    this.enrollmentsService
      .myEnrollments()
      .pipe(
        switchMap((enrollments) => {
          const active = enrollments.filter(
            (e): e is Enrollment & { courseId: Course } =>
              e.status === 'active' && typeof e.courseId === 'object',
          );
          if (!active.length) return of([] as MyCourseView[]);

          const requests = active.map((enrollment) => {
            const course = enrollment.courseId;
            const moduleId = enrollmentModuleId(enrollment);
            if (moduleId) {
              const module = enrollment.moduleId as CourseModule;
              return this.enrollmentsService.moduleProgress(moduleId).pipe(
                switchMap((progress) =>
                  of({
                    key: `module-${moduleId}`,
                    course,
                    subtitle: module.title,
                    progress,
                    continueLink: progress.nextLessonId
                      ? ['/student/aula', moduleId, progress.nextLessonId]
                      : ['/student/cursos', course.id],
                  }),
                ),
              );
            }
            const courseId = enrollmentCourseId(enrollment);
            return this.enrollmentsService.courseTrackProgress(courseId).pipe(
              switchMap((progress) =>
                of({
                  key: `track-${courseId}`,
                  course,
                  subtitle: 'Trilha de aulas avulsas',
                  progress,
                  continueLink: progress.nextLessonId
                    ? ['/student/aula/curso', courseId, progress.nextLessonId]
                    : ['/student/cursos', course.id],
                }),
              ),
            );
          });

          return forkJoin(requests);
        }),
      )
      .subscribe({
        next: (views) => {
          this.inProgress.set(views.filter((v) => v.progress.percentage < 100));
          this.completed.set(views.filter((v) => v.progress.percentage >= 100));
          this.loading.set(false);
          event?.target.complete();
        },
        error: () => {
          this.loading.set(false);
          event?.target.complete();
        },
      });
  }

  initial(name: string | undefined): string {
    return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  }

  open(view: MyCourseView) {
    this.router.navigate(view.continueLink);
  }
}
