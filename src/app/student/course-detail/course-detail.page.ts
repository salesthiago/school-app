import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, interval, switchMap, takeWhile } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonButton,
  IonSpinner,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonTextarea,
  IonBadge,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { copyOutline, checkmarkCircle, star, starOutline } from 'ionicons/icons';
import { CoursesService } from '../../core/services/courses.service';
import { LessonsService } from '../../core/services/lessons.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { PaymentsService } from '../../core/services/payments.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { Course, CourseModule, Enrollment } from '../../core/models/academic.model';
import { CheckoutResponse, PaymentMethod } from '../../core/models/payment.model';
import { CourseReviewsOverview, Review, ReviewEligibility } from '../../core/models/review.model';

type PurchasableState = 'enrolled' | 'free' | 'paid';
type CheckoutTarget = { type: 'module'; module: CourseModule } | { type: 'course' };

interface ModuleView {
  module: CourseModule;
  state: PurchasableState;
  priceLabel: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

function moduleIdOf(e: Enrollment): string | null {
  if (!e.moduleId) return null;
  return typeof e.moduleId === 'string' ? e.moduleId : e.moduleId.id;
}

function courseIdOf(e: Enrollment): string {
  return typeof e.courseId === 'string' ? e.courseId : e.courseId.id;
}

@Component({
  selector: 'app-course-detail',
  standalone: true,
  templateUrl: './course-detail.page.html',
  styleUrl: './course-detail.page.scss',
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardContent,
    IonButton,
    IonSpinner,
    IonModal,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonTextarea,
    IonBadge,
  ],
})
export class CourseDetailPage implements OnInit {
  loading = signal(true);
  notFound = signal(false);
  course = signal<Course | null>(null);
  moduleViews = signal<ModuleView[]>([]);
  enrollingModuleId = signal<string | null>(null);
  enrollingCourseTrack = signal(false);

  courseTrackHasLessons = signal(false);
  courseTrackEnrolled = signal(false);
  courseTrackState = computed<PurchasableState>(() =>
    this.courseTrackEnrolled() ? 'enrolled' : this.course()?.free || !this.course()?.bundlePrice ? 'free' : 'paid',
  );
  courseTrackPriceLabel = computed(() =>
    this.course()?.free || !this.course()?.bundlePrice ? '' : currencyFormatter.format(this.course()!.bundlePrice!),
  );

  checkoutTarget = signal<CheckoutTarget | null>(null);
  checkoutMethod = signal<PaymentMethod>('pix');
  checkoutLoading = signal(false);
  checkoutError = signal<string | null>(null);
  checkoutResult = signal<CheckoutResponse | null>(null);
  paymentConfirmed = signal(false);

  reviewsOverview = signal<CourseReviewsOverview | null>(null);
  myReview = signal<Review | null>(null);
  reviewEligibility = signal<ReviewEligibility | null>(null);
  editingReview = signal(false);
  selectedRating = signal(0);
  reviewComment = signal('');
  savingReview = signal(false);
  reviewError = signal<string | null>(null);
  reviewSaved = signal(false);

  anyEnrolled = computed(
    () => this.courseTrackEnrolled() || this.moduleViews().some((v) => v.state === 'enrolled'),
  );
  /** Nota e comentário são obrigatórios no app; o comentário passa pela aprovação do professor. */
  canSubmitReview = computed(() => this.selectedRating() >= 1 && this.reviewComment().trim().length > 0);

  private courseId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coursesService: CoursesService,
    private lessonsService: LessonsService,
    private enrollmentsService: EnrollmentsService,
    private paymentsService: PaymentsService,
    private reviewsService: ReviewsService,
    private destroyRef: DestroyRef,
    private sanitizer: DomSanitizer,
    private toastController: ToastController,
  ) {
    addIcons({ copyOutline, checkmarkCircle, star, starOutline });
  }

  /** Descrição vem do editor rich-text (Quill) usado por professor/admin — conteúdo confiável. */
  safeHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  private load() {
    this.loading.set(true);
    forkJoin({
      course: this.coursesService.getCourse(this.courseId),
      modules: this.coursesService.listModules(this.courseId),
      enrollments: this.enrollmentsService.myEnrollments(),
    }).subscribe({
      next: ({ course, modules, enrollments }) => {
        this.course.set(course);
        const active = enrollments.filter((e) => e.status === 'active' && courseIdOf(e) === this.courseId);
        const enrolledModuleIds = new Set(active.map(moduleIdOf).filter((id): id is string => !!id));
        this.courseTrackEnrolled.set(active.some((e) => moduleIdOf(e) === null));

        this.moduleViews.set(
          modules
            .filter((m) => m.published)
            .sort((a, b) => a.order - b.order)
            .map((module) => ({
              module,
              state: enrolledModuleIds.has(module.id)
                ? 'enrolled'
                : module.free || module.price === 0
                  ? 'free'
                  : 'paid',
              priceLabel:
                module.free || module.price === 0 ? '' : currencyFormatter.format(module.price),
            })),
        );
        this.loading.set(false);
        this.loadReviews();
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });

    this.lessonsService.listByCourse(this.courseId).subscribe({
      next: (lessons) => this.courseTrackHasLessons.set(lessons.length > 0),
      error: (err) => this.courseTrackHasLessons.set(err?.status === 403),
    });
  }

  teacherName(): string {
    const teacher = this.course()?.teacherId as unknown;
    if (teacher && typeof teacher === 'object' && 'name' in teacher) {
      return (teacher as { name: string }).name;
    }
    return '';
  }

  continueModule(moduleId: string) {
    forkJoin({
      lessons: this.coursesService.listLessons(moduleId),
      progress: this.enrollmentsService.moduleProgress(moduleId),
    }).subscribe({
      next: ({ lessons, progress }) => {
        const lessonId = progress.nextLessonId ?? lessons[0]?.id;
        if (lessonId) {
          this.router.navigate(['/student/aula', moduleId, lessonId]);
        } else {
          this.notify('Este módulo ainda não tem nenhuma aula publicada.');
        }
      },
      error: () => this.notify('Não foi possível abrir o módulo. Tente novamente.'),
    });
  }

  continueCourseTrack() {
    forkJoin({
      lessons: this.lessonsService.listByCourse(this.courseId),
      progress: this.enrollmentsService.courseTrackProgress(this.courseId),
    }).subscribe({
      next: ({ lessons, progress }) => {
        const lessonId = progress.nextLessonId ?? lessons[0]?.id;
        if (lessonId) {
          this.router.navigate(['/student/aula/curso', this.courseId, lessonId]);
        } else {
          this.notify('Ainda não há aulas publicadas nesta trilha.');
        }
      },
      error: () => this.notify('Não foi possível abrir a trilha de aulas. Tente novamente.'),
    });
  }

  enrollFree(module: CourseModule) {
    this.enrollingModuleId.set(module.id);
    this.enrollmentsService.enroll({ moduleId: module.id }).subscribe({
      next: () => {
        this.enrollingModuleId.set(null);
        this.continueModule(module.id);
      },
      error: () => this.enrollingModuleId.set(null),
    });
  }

  enrollFreeCourseTrack() {
    this.enrollingCourseTrack.set(true);
    this.enrollmentsService.enroll({ courseId: this.courseId }).subscribe({
      next: () => {
        this.enrollingCourseTrack.set(false);
        this.courseTrackEnrolled.set(true);
        this.continueCourseTrack();
      },
      error: () => this.enrollingCourseTrack.set(false),
    });
  }

  openCheckout(module: CourseModule) {
    this.checkoutTarget.set({ type: 'module', module });
    this.resetCheckoutState();
  }

  openCourseTrackCheckout() {
    this.checkoutTarget.set({ type: 'course' });
    this.resetCheckoutState();
  }

  private resetCheckoutState() {
    this.checkoutMethod.set('pix');
    this.checkoutResult.set(null);
    this.checkoutError.set(null);
    this.paymentConfirmed.set(false);
  }

  closeCheckout() {
    this.checkoutTarget.set(null);
  }

  selectMethod(method: PaymentMethod) {
    this.checkoutMethod.set(method);
  }

  startCheckout() {
    const target = this.checkoutTarget();
    if (!target) return;
    this.checkoutLoading.set(true);
    this.checkoutError.set(null);
    const payload = target.type === 'module' ? { moduleId: target.module.id } : { courseId: this.courseId };
    this.paymentsService.checkout(payload, this.checkoutMethod()).subscribe({
      next: (result) => {
        this.checkoutLoading.set(false);
        this.checkoutResult.set(result);
        this.pollForConfirmation(target);
      },
      error: () => {
        this.checkoutLoading.set(false);
        this.checkoutError.set('Não foi possível gerar a cobrança. Tente novamente.');
      },
    });
  }

  goToPurchased() {
    const target = this.checkoutTarget();
    if (!target) return;
    this.closeCheckout();
    if (target.type === 'module') {
      this.continueModule(target.module.id);
    } else {
      this.continueCourseTrack();
    }
  }

  async copy(text: string | undefined) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    this.notify('Copiado!');
  }

  private async notify(message: string) {
    const toast = await this.toastController.create({ message, duration: 2500, position: 'bottom' });
    await toast.present();
  }

  private pollForConfirmation(target: CheckoutTarget) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.enrollmentsService.myEnrollments()),
        takeWhile(() => Date.now() < deadline && !this.paymentConfirmed()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((enrollments) => {
        const confirmed = enrollments.some((e) => {
          if (e.status !== 'active' || courseIdOf(e) !== this.courseId) return false;
          const mid = moduleIdOf(e);
          return target.type === 'module' ? mid === target.module.id : mid === null;
        });
        if (confirmed) {
          this.paymentConfirmed.set(true);
          this.load();
        }
      });
  }

  // ---------- Avaliações ----------

  private loadReviews() {
    this.reviewsService.publicOverview(this.courseId).subscribe({
      next: (overview) => this.reviewsOverview.set(overview),
      error: () => {},
    });

    if (!this.anyEnrolled()) return;
    this.reviewsService.mine(this.courseId).subscribe({
      next: ({ review, eligibility }) => {
        this.myReview.set(review);
        this.reviewEligibility.set(eligibility);
        this.selectedRating.set(review?.rating ?? 0);
        this.reviewComment.set(review?.comment ?? '');
      },
      error: () => {},
    });
  }

  stars(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  setRating(value: number) {
    this.selectedRating.set(value);
  }

  onCommentInput(event: Event) {
    this.reviewComment.set(((event as CustomEvent).detail?.value ?? '') as string);
  }

  startEditReview() {
    const mine = this.myReview();
    this.selectedRating.set(mine?.rating ?? 0);
    this.reviewComment.set(mine?.comment ?? '');
    this.reviewSaved.set(false);
    this.reviewError.set(null);
    this.editingReview.set(true);
  }

  submitReview() {
    if (!this.canSubmitReview()) return;
    this.savingReview.set(true);
    this.reviewError.set(null);
    this.reviewSaved.set(false);
    this.reviewsService
      .upsert(this.courseId, { rating: this.selectedRating(), comment: this.reviewComment().trim() })
      .subscribe({
        next: (review) => {
          this.myReview.set(review);
          this.savingReview.set(false);
          this.reviewSaved.set(true);
          this.editingReview.set(false);
        },
        error: (err) => {
          this.savingReview.set(false);
          this.reviewError.set(err?.error?.message ?? 'Não foi possível enviar sua avaliação.');
        },
      });
  }

  reviewStatusLabel(status: string): string {
    return status === 'approved' ? 'Aprovada' : status === 'rejected' ? 'Rejeitada' : 'Em análise';
  }

  reviewStatusColor(status: string): string {
    return status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'medium';
  }

  reviewerName(review: Review): string {
    const student = review.studentId as unknown;
    if (student && typeof student === 'object' && 'name' in student) {
      return (student as { name: string }).name;
    }
    return 'Aluno';
  }
}
