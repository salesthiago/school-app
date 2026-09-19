import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Institution } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class InstitutionsService {
  constructor(private http: HttpClient) {}

  getPublic() {
    return this.http.get<Institution>(`${environment.apiUrl}/institutions/public`);
  }
}
