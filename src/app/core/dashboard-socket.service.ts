import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Dashboard } from './models';

const ATRASO_MAXIMO_MS = 15000;

/** Mantém uma conexão WebSocket com o backend para atualizar o painel do dia em tempo real. */
@Injectable({ providedIn: 'root' })
export class DashboardSocketService {
  private auth = inject(AuthService);
  private socket: WebSocket | null = null;
  private ativo = false;
  private tentativas = 0;
  private reconexaoTimer: ReturnType<typeof setTimeout> | null = null;

  readonly dashboard = signal<Dashboard | null>(null);
  readonly conectado = signal(false);

  conectar() {
    if (this.ativo) return;
    this.ativo = true;
    this.abrir();
  }

  desconectar() {
    this.ativo = false;
    if (this.reconexaoTimer) {
      clearTimeout(this.reconexaoTimer);
      this.reconexaoTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.conectado.set(false);
  }

  private abrir() {
    const token = this.auth.token();
    if (!token) return;
    const url = `${environment.apiUrl.replace(/^http/, 'ws')}/ws/dashboard?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    this.socket = ws;

    ws.onopen = () => {
      this.tentativas = 0;
      this.conectado.set(true);
    };
    ws.onmessage = ev => {
      try {
        this.dashboard.set(JSON.parse(ev.data) as Dashboard);
      } catch {
        /* mensagem inválida, ignora */
      }
    };
    ws.onclose = () => {
      this.conectado.set(false);
      if (this.ativo) this.reagendar();
    };
    ws.onerror = () => ws.close();
  }

  private reagendar() {
    const atraso = Math.min(1000 * 2 ** this.tentativas, ATRASO_MAXIMO_MS);
    this.tentativas++;
    this.reconexaoTimer = setTimeout(() => {
      if (this.ativo) this.abrir();
    }, atraso);
  }
}
