import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Order } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  constructor(private http: HttpClient) {}

  /** Pedidos do aluno logado, do mais recente para o mais antigo. */
  mine() {
    return this.http.get<Order[]>(`${environment.apiUrl}/orders/mine`);
  }
}
