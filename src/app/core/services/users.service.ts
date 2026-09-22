import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  bio?: string;
  instagram?: string;
  twitter?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  me() {
    return this.http.get<User>(`${environment.apiUrl}/users/me`);
  }

  updateProfile(payload: UpdateProfilePayload) {
    return this.http.patch<User>(`${environment.apiUrl}/users/me`, payload);
  }

  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<User>(`${environment.apiUrl}/users/me/avatar`, formData);
  }

  changePassword(payload: ChangePasswordPayload) {
    return this.http.patch<User>(`${environment.apiUrl}/users/me/password`, payload);
  }
}
