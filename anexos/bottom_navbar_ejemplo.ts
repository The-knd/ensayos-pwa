import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MicrosoftAuthService } from '../../services/microsoft-auth.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabbar">
      <a
        routerLink="/home"
        routerLinkActive="on"
        [routerLinkActiveOptions]="{ exact: true }"
        class="tab"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-8Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
        <span>Inicio</span>
      </a>

      @if (showFab()) {
        <button class="fab" (click)="onBubbleClick()">
          <span class="fab-inner"><img src="/Elena-min.png" alt="Chat" class="fab-img" /></span>
          <span class="pulse"></span>
        </button>
      }

      @if (authService.isLoggedIn()) {
        <a routerLink="/profile" routerLinkActive="on" class="tab">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="2" />
            <path
              d="M5 20c0-3.4 3.1-6 7-6s7 2.6 7 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <span>Perfil</span>
        </a>
      } @else {
        <a routerLink="/login" class="tab">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="2" />
            <path
              d="M5 20c0-3.4 3.1-6 7-6s7 2.6 7 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <span>Perfil</span>
        </a>
      }
    </nav>

    @if (panelOpen()) {
      <div class="overlay" (click)="panelOpen.set(false)">
        <div class="panel" (click)="$event.stopPropagation()">
          <div class="panel-header">
            <span>🔍 Diagnóstico de Autenticación</span>
            <button class="close-btn" (click)="panelOpen.set(false)">✕</button>
          </div>

          <div class="panel-body">
            <div class="info-row">
              <span class="label">Auth Level:</span>
              <span class="value" [class.ok]="authService.authLevel() === 'full'">
                {{ authService.authLevel() }}
              </span>
            </div>
            <div class="info-row">
              <span class="label">Logged In:</span>
              <span class="value" [class.ok]="authService.isLoggedIn()">
                {{ authService.isLoggedIn() ? '✅ Sí' : '❌ No' }}
              </span>
            </div>
            <div class="info-row">
              <span class="label">Microsoft Session:</span>
              <span class="value" [class.ok]="authService.isFullyAuthenticated()">
                {{ authService.isFullyAuthenticated() ? '✅ Activa' : '❌ Inactiva' }}
              </span>
            </div>

            @if (authService.isFullyAuthenticated()) {
              <hr />
              <h4>Token Power Platform</h4>

              @if (ppLoading()) {
                <div class="loading">Obteniendo token…</div>
              }

              @if (ppError(); as err) {
                <div class="error-msg">{{ err }}</div>
              }

              @if (ppResult(); as r) {
                <div class="info-row">
                  <span class="label">Estado:</span>
                  <span class="value" [class.ok]="r.ppTokenOk">
                    {{ r.ppTokenOk ? '✅ OK' : '❌ Falló' }}
                  </span>
                </div>
                <details class="diagnostic-details">
                  <summary>Diagnóstico</summary>
                  <div class="info-row">
                    <span class="label">JWT userId:</span
                    ><span class="value mono">{{ r.jwtUserId }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">DB userId:</span
                    ><span class="value mono">{{ r.dbUserId }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Email:</span><span class="value mono">{{ r.email }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Microsoft ID:</span
                    ><span class="value mono">{{ r.microsoftId }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Has refresh token:</span
                    ><span class="value">{{ r.hasRefreshToken ? '✅' : '❌' }}</span>
                  </div>
                  @if (r.tokenOid || r.tokenUpn) {
                    <div class="info-row">
                      <span class="label">PP Token OID:</span
                      ><span class="value mono">{{ r.tokenOid }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">PP Token UPN:</span
                      ><span class="value mono">{{ r.tokenUpn }}</span>
                    </div>
                  }
                </details>
                @if (r.ppTokenPreview) {
                  <div class="info-row">
                    <span class="label">Token (oid):</span>
                    <span class="value mono">{{ r.ppTokenPreview }}</span>
                  </div>
                }
                @if (r.message) {
                  <div class="info-row">
                    <span class="label">Mensaje:</span>
                    <span class="value">{{ r.message }}</span>
                  </div>
                }

                @if (r.ppTokenOk) {
                  <button class="refresh-btn" (click)="checkToken()">🔄 Refrescar</button>
                  <button class="chat-btn" (click)="openChat()">🤖 Abrir Copilot Studio</button>
                }

                @if (!r.ppTokenOk && r.hasMicrosoftSession) {
                  <p class="hint">
                    El token expiró o fue revocado. Vuelve a iniciar sesión con Microsoft.
                  </p>
                  <button class="microsoft-btn" (click)="microsoftLogin()">
                    🔵 Iniciar sesión con Microsoft
                  </button>
                }
              } @else {
                <button class="refresh-btn" (click)="checkToken()">🔄 Verificar token</button>
              }

              <button
                class="invalidate-btn"
                (click)="invalidateMicrosoft()"
                [disabled]="invalidating()"
              >
                {{ invalidating() ? 'Invalidando…' : '🗑️ Invalidar sesión MS (debug)' }}
              </button>
            } @else if (authService.isLoggedIn()) {
              <hr />
              <p class="hint">
                No tienes una sesión de Microsoft activa. Inicia sesión con Microsoft para probar el
                token Power Platform.
              </p>
              <button class="microsoft-btn" (click)="microsoftLogin()">
                🔵 Iniciar sesión con Microsoft
              </button>
            } @else {
              <hr />
              <p class="hint">Inicia sesión primero para probar el token.</p>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .tabbar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--white);
        border-top: 1px solid var(--line);
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 9px 8px;
        padding-bottom: max(9px, env(safe-area-inset-bottom));
        z-index: 1000;
      }

      .tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        font-size: 9.5px;
        font-weight: 700;
        color: var(--faint);
        cursor: pointer;
        flex: 1;
        transition: 0.15s;
        text-decoration: none;
        font-family: var(--body);
      }

      .tab svg {
        width: 21px;
        height: 21px;
      }

      .tab.on {
        color: var(--green-deep);
      }

      .fab {
        position: relative;
        top: -20px;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: var(--white);
        padding: 3px;
        box-shadow: 0 14px 26px -10px rgba(16, 69, 132, 0.55);
        cursor: pointer;
        border: 0;
        flex-shrink: 0;
        transition: transform 0.16s;
      }

      .fab:hover {
        transform: translateY(-2px);
      }

      .fab-inner {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        border: 2px solid var(--accent);
        background: var(--white);
        overflow: hidden;
      }

      .fab-img {
        width: 70%;
        height: 70%;
        object-fit: contain;
        border-radius: 50%;
      }

      .pulse {
        position: absolute;
        bottom: 3px;
        right: 3px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--green-light);
        border: 2px solid var(--white);
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 999;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 1rem;
        padding-bottom: calc(80px + env(safe-area-inset-bottom));
      }

      .panel {
        width: 100%;
        max-width: 400px;
        max-height: 70vh;
        background: #fff;
        border-radius: 16px 16px 0 0;
        display: flex;
        flex-direction: column;
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        animation: slideUp 0.2s ease-out;
      }

      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: #007bff;
        color: #fff;
        font-weight: 600;
        font-size: 0.95rem;
      }

      .close-btn {
        background: none;
        border: none;
        color: #fff;
        font-size: 1.1rem;
        cursor: pointer;
        line-height: 1;
      }

      .panel-body {
        padding: 1rem;
        overflow-y: auto;
        font-family: sans-serif;
        font-size: 0.9rem;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 0.4rem 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .info-row .label {
        color: #666;
      }
      .info-row .value {
        font-weight: 600;
      }
      .info-row .value.ok {
        color: #28a745;
      }
      .info-row .value.mono {
        font-family: monospace;
        font-size: 0.75rem;
        word-break: break-all;
      }

      .diagnostic-details {
        margin: 0.5rem 0;
        font-size: 0.8rem;
      }
      .diagnostic-details summary {
        cursor: pointer;
        color: #007bff;
        font-size: 0.8rem;
        padding: 0.3rem 0;
      }
      .diagnostic-details .info-row {
        padding: 0.2rem 0;
      }
      .diagnostic-details .info-row .label {
        color: #888;
        font-size: 0.75rem;
      }
      .diagnostic-details .info-row .value {
        font-weight: 400;
      }

      .loading {
        text-align: center;
        padding: 1rem;
        color: #666;
        font-style: italic;
      }

      .error-msg {
        background: #f8d7da;
        color: #721c24;
        padding: 0.5rem;
        border-radius: 6px;
        font-size: 0.85rem;
        margin: 0.5rem 0;
      }

      .hint {
        color: #666;
        font-size: 0.85rem;
        text-align: center;
        margin: 0.5rem 0;
      }

      hr {
        border: none;
        border-top: 1px solid #e0e0e0;
        margin: 0.75rem 0;
      }

      h4 {
        margin: 0.5rem 0;
        font-size: 0.95rem;
      }

      .invalidate-btn {
        width: 100%;
        padding: 0.7rem;
        border: 1px solid #dc3545;
        border-radius: 8px;
        font-size: 0.85rem;
        cursor: pointer;
        margin-top: 0.5rem;
        background: #fff;
        color: #dc3545;
      }

      .invalidate-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .microsoft-btn,
      .refresh-btn,
      .chat-btn {
        width: 100%;
        padding: 0.7rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.5rem;
      }

      .microsoft-btn {
        background: #2f2f2f;
        color: #fff;
      }
      .refresh-btn {
        background: #e8f0fe;
        color: #007bff;
      }
      .chat-btn {
        background: #10a37f;
        color: #fff;
      }

      @media (min-width: 768px) {
        .overlay {
          align-items: center;
          padding-bottom: 1rem;
        }
        .panel {
          border-radius: 16px;
          max-height: 500px;
        }
      }
    `,
  ],
})
export class BottomNav {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly authService = inject(AuthService);
  protected readonly microsoftAuthService = inject(MicrosoftAuthService);

  protected readonly panelOpen = signal(false);
  protected readonly ppLoading = signal(false);
  protected readonly ppError = signal<string | null>(null);
  protected readonly ppResult = signal<{
    hasMicrosoftSession?: boolean;
    ppTokenOk: boolean;
    ppTokenPreview?: string;
    tokenOid?: string;
    tokenUpn?: string;
    message?: string;
    jwtUserId?: number;
    dbUserId?: number;
    email?: string;
    microsoftId?: string;
    hasRefreshToken?: boolean;
  } | null>(null);
  protected readonly invalidating = signal(false);
  protected readonly showFab = signal(false);

  private readonly hiddenFabRoutes = new Set(['/login', '/services', '/home', '/herragro/chat']);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const pending = sessionStorage.getItem('openChat');
      if (pending === 'true') {
        sessionStorage.removeItem('openChat');
        queueMicrotask(() => {
          if (this.authService.isFullyAuthenticated()) {
            this.router.navigate(['/chat']);
          }
        });
      }
    }

    this.showFab.set(!this.hiddenFabRoutes.has(this.router.url) && !this.authService.guestMode());
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.showFab.set(!this.hiddenFabRoutes.has(e.url) && !this.authService.guestMode());
      }
    });
  }

  async onBubbleClick() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.authService.isFullyAuthenticated()) {
      this.router.navigate(['/chat']);
      return;
    }

    const upgraded = await this.authService.tryUpgradeSession();
    if (upgraded) {
      this.router.navigate(['/chat']);
    } else {
      sessionStorage.setItem('openChat', 'true');
      await this.microsoftAuthService.login();
    }
  }

  protected async checkToken() {
    this.ppLoading.set(true);
    this.ppError.set(null);
    this.ppResult.set(null);

    try {
      const res = await lastValueFrom(
        this.http.post<{
          hasMicrosoftSession: boolean;
          ppTokenOk: boolean;
          ppTokenPreview?: string;
          message?: string;
        }>('/api/copilot/debug-token', {}),
      );
      this.ppResult.set(res);
    } catch (err: any) {
      this.ppError.set(err?.error?.message ?? err?.message ?? 'Error al obtener token');
    } finally {
      this.ppLoading.set(false);
    }
  }

  protected async microsoftLogin() {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('openChat', 'true');
    }
    await this.microsoftAuthService.login();
  }

  protected async invalidateMicrosoft() {
    this.invalidating.set(true);
    try {
      await lastValueFrom(this.http.post('/api/copilot/debug-invalidate', {}));
      // Reset in-memory state so panel re-renders
      this.authService.clearMicrosoftSession();
      this.ppResult.set(null);
      this.ppError.set(null);
    } catch (err: any) {
      this.ppError.set(err?.error?.message ?? 'Error al invalidar sesión');
    } finally {
      this.invalidating.set(false);
    }
  }

  protected openChat() {
    this.panelOpen.set(false);
    this.router.navigate(['/chat']);
  }
}
