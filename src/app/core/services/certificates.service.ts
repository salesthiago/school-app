import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Certificate } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class CertificatesService {
  constructor(private http: HttpClient) {}

  myCertificates() {
    return this.http.get<Certificate[]>(`${environment.apiUrl}/certificates/mine`);
  }

  getDownloadUrl(id: string) {
    return this.http.get<{ url: string }>(`${environment.apiUrl}/certificates/${id}/download`);
  }
}
