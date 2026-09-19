import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isPublic = PUBLIC_PATHS.some((path) => req.url.includes(path));
  const token = authService.getAccessToken();

  const authReq = !isPublic && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isPublic &&
        authService.getRefreshToken()
      ) {
        return authService.refreshShared().pipe(
          switchMap(() => {
            const retryToken = authService.getAccessToken();
            const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${retryToken}` } });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            authService.logout();
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
