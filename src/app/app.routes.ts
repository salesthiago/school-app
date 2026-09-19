import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () => import('./auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'student',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./student/tabs/tabs.page').then((m) => m.TabsPage),
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./student/dashboard/dashboard.page').then((m) => m.DashboardPage),
          },
          {
            path: 'meus-cursos',
            loadComponent: () => import('./student/my-courses/my-courses.page').then((m) => m.MyCoursesPage),
          },
          {
            path: 'perfil',
            loadComponent: () => import('./student/profile/profile.page').then((m) => m.ProfilePage),
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ],
      },
      {
        path: 'cursos/:id',
        loadComponent: () =>
          import('./student/course-detail/course-detail.page').then((m) => m.CourseDetailPage),
      },
      {
        path: 'aula/:moduleId/:lessonId',
        loadComponent: () =>
          import('./student/course-player/course-player.page').then((m) => m.CoursePlayerPage),
      },
      {
        path: 'aula/curso/:courseId/:lessonId',
        loadComponent: () =>
          import('./student/course-player/course-player.page').then((m) => m.CoursePlayerPage),
      },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];
