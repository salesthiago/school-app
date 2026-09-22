import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import type { RefresherCustomEvent } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ribbonOutline } from 'ionicons/icons';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { CertificatesService } from '../../core/services/certificates.service';
import { CoursesService } from '../../core/services/courses.service';
import { OrdersService } from '../../core/services/orders.service';
import { Certificate, Course, CourseModule, Enrollment, ModuleProgressSummary } from '../../core/models/academic.model';
import { Order, OrderStatus } from '../../core/models/payment.model';

type HistoryFilter = 'all' | 'in-progress' | 'completed';

interface HistoryItem {
  key: string;
  course: Course;
  /** Título do módulo; vazio quando a matrícula é na trilha de aulas do curso. */
  subtitle: string;
  enrolledAt?: string;
  percentage: number;
  completed: boolean;
  /** Carga horária do módulo; 0 quando desconhecida (trilha de aulas). */
  workloadHours: number;
}

interface PaymentItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  methodLabel: string;
  statusLabel: string;
  statusColor: 'success' | 'warning' | 'danger' | 'medium';
}

const METHOD_LABELS: Record<Order['paymentMethod'], string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
};

const STATUS_VIEW: Record<OrderStatus, { label: string; color: PaymentItem['statusColor'] }> = {
  paid: { label: 'Pago', color: 'success' },
  pending: { label: 'Aguardando pagamento', color: 'warning' },
  expired: { label: 'Expirado', color: 'medium' },
  canceled: { label: 'Cancelado', color: 'danger' },
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Component({
  selector: 'app-history',
  standalone: true,
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss',
  imports: [
    CommonModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonContent,
    IonHeader,
    IonIcon,
    IonLabel,
    IonProgressBar,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class HistoryPage implements OnInit {
  loading = signal(true);
  items = signal<HistoryItem[]>([]);
  certificates = signal<Certificate[]>([]);
  payments = signal<PaymentItem[]>([]);
  filter = signal<HistoryFilter>('all');
  downloadingId = signal<string | null>(null);

  completedCount = computed(() => this.items().filter((i) => i.completed).length);
  inProgressCount = computed(() => this.items().filter((i) => !i.completed).length);
  completedHours = computed(() =>
    this.items()
      .filter((i) => i.completed)
      .reduce((sum, i) => sum + i.workloadHours, 0),
  );
  visibleItems = computed(() => {
    const filter = this.filter();
    return this.items().filter((i) => filter === 'all' || (filter === 'completed') === i.completed);
  });

  constructor(
    private enrollmentsService: EnrollmentsService,
    private certificatesService: CertificatesService,
    private coursesService: CoursesService,
    private ordersService: OrdersService,
    private router: Router,
  ) {
    addIcons({ ribbonOutline });
  }

  ngOnInit() {
    this.load();
  }

  load(event?: RefresherCustomEvent) {
    forkJoin({
      enrollments: this.enrollmentsService.myEnrollments().pipe(catchError(() => of([] as Enrollment[]))),
      certificates: this.certificatesService.myCertificates().pipe(catchError(() => of([] as Certificate[]))),
      orders: this.ordersService.mine().pipe(catchError(() => of([] as Order[]))),
    })
      .pipe(
        switchMap(({ enrollments, certificates, orders }) =>
          forkJoin({
            items: this.buildItems(enrollments),
            payments: this.buildPayments(orders, enrollments),
          }).pipe(map(({ items, payments }) => ({ items, payments, certificates }))),
        ),
      )
      .subscribe({
        next: ({ items, payments, certificates }) => {
          this.items.set(items);
          this.payments.set(payments);
          this.certificates.set(certificates);
          this.loading.set(false);
          event?.target.complete();
        },
        error: () => {
          this.loading.set(false);
          event?.target.complete();
        },
      });
  }

  setFilter(value: unknown) {
    if (value === 'all' || value === 'in-progress' || value === 'completed') this.filter.set(value);
  }

  openCourse(item: HistoryItem) {
    this.router.navigate(['/student/cursos', item.course.id]);
  }

  download(cert: Certificate) {
    this.downloadingId.set(cert.id);
    this.certificatesService.getDownloadUrl(cert.id).subscribe({
      next: ({ url }) => {
        this.downloadingId.set(null);
        window.open(url, '_blank');
      },
      error: () => this.downloadingId.set(null),
    });
  }

  formatDate(iso: string | undefined): string {
    return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
  }

  formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  // ---------- Montagem dos dados ----------

  private buildItems(enrollments: Enrollment[]): Observable<HistoryItem[]> {
    const active = enrollments.filter(
      (e): e is Enrollment & { courseId: Course } => e.status === 'active' && typeof e.courseId === 'object',
    );
    if (!active.length) return of([]);

    const requests = active.map((enrollment) => {
      const course = enrollment.courseId;
      const module = enrollment.moduleId && typeof enrollment.moduleId === 'object' ? enrollment.moduleId : null;
      const progress$: Observable<ModuleProgressSummary | null> = (
        module
          ? this.enrollmentsService.moduleProgress(module.id)
          : this.enrollmentsService.courseTrackProgress(course.id)
      ).pipe(catchError(() => of(null)));

      return progress$.pipe(
        map((progress): HistoryItem => {
          const percentage = progress?.percentage ?? 0;
          return {
            key: module ? `module-${module.id}` : `track-${course.id}`,
            course,
            subtitle: module?.title ?? 'Trilha de aulas avulsas',
            enrolledAt: enrollment.createdAt,
            percentage,
            completed: percentage >= 100,
            workloadHours: module?.workloadHours ?? 0,
          };
        }),
      );
    });

    return forkJoin(requests).pipe(
      map((list) => list.sort((a, b) => (b.enrolledAt ?? '').localeCompare(a.enrolledAt ?? ''))),
    );
  }

  /** Os pedidos só trazem ids: os nomes vêm das matrículas e, no que faltar, do catálogo público. */
  private buildPayments(orders: Order[], enrollments: Enrollment[]): Observable<PaymentItem[]> {
    if (!orders.length) return of([]);

    const courseTitles = new Map<string, string>();
    const moduleTitles = new Map<string, string>();
    for (const e of enrollments) {
      if (e.courseId && typeof e.courseId === 'object') courseTitles.set(e.courseId.id, e.courseId.title);
      if (e.moduleId && typeof e.moduleId === 'object') moduleTitles.set(e.moduleId.id, e.moduleId.title);
    }

    const missingCourseIds = [
      ...new Set(
        orders
          .filter((o) => !courseTitles.has(o.courseId) || (o.moduleId && !moduleTitles.has(o.moduleId)))
          .map((o) => o.courseId),
      ),
    ];

    const lookups$ = missingCourseIds.length
      ? forkJoin(
          missingCourseIds.map((courseId) =>
            forkJoin({
              course: this.coursesService.getCourse(courseId).pipe(catchError(() => of(null))),
              modules: this.coursesService.listModules(courseId).pipe(catchError(() => of([] as CourseModule[]))),
            }),
          ),
        )
      : of([]);

    return lookups$.pipe(
      map((lookups) => {
        for (const { course, modules } of lookups) {
          if (course) courseTitles.set(course.id, course.title);
          for (const m of modules) moduleTitles.set(m.id, m.title);
        }
        return orders.map((order): PaymentItem => {
          const status = STATUS_VIEW[order.status] ?? { label: order.status, color: 'medium' as const };
          return {
            id: order.id,
            title: courseTitles.get(order.courseId) ?? 'Curso',
            subtitle: order.moduleId ? (moduleTitles.get(order.moduleId) ?? 'Módulo') : '',
            date: order.paidAt ?? order.createdAt,
            amount: order.amount,
            methodLabel: METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod,
            statusLabel: status.label,
            statusColor: status.color,
          };
        });
      }),
    );
  }
}
