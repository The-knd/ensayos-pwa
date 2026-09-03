import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConnectivityService } from '../../services/connectivity.service';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar" [style.background]="bgGradient()">
      <div class="navbar-inner">
        @if (companyService.currentCompany(); as c) {
          <a [routerLink]="c.homeRoute" class="brand company-brand">
            <img [src]="c.logoUrl" [alt]="c.name" class="brand-logo">
            <span>{{ c.name }}</span>
            <span class="status-dot" [class.online]="connectivity.isOnline()" [class.offline]="!connectivity.isOnline()">
              {{ connectivity.isOnline() ? 'En línea' : 'Sin conexión' }}
            </span>
          </a>
        } @else {
          <a routerLink="/home" class="brand">
            Elena <span class="brand-highlight">360</span>
            <span class="status-dot" [class.online]="connectivity.isOnline()" [class.offline]="!connectivity.isOnline()">
              {{ connectivity.isOnline() ? 'En línea' : 'Sin conexión' }}
            </span>
          </a>
        }
        <div class="nav-links">
          @if (authService.isLoggedIn()) {
            <button class="ibtn" title="Notificaciones">
              <svg viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
            </button>
            <button (click)="authService.logout()" class="logout-btn" title="Cerrar sesión">
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          } @else {
            <a routerLink="/login" routerLinkActive="active">Ingresar</a>
          }
        </div>
      </div>
    </nav>
  `,
  styles: `
    :host { display: block; }
    .navbar {
      background: linear-gradient(155deg, #1356a0, var(--blue) 60%, #0d3970);
      padding: 12px 20px 16px;
      position: relative;
      overflow: hidden;
    }
    .navbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }
    .brand {
      font-family: var(--display);
      font-weight: 700;
      color: #fff;
      font-size: 22px;
      letter-spacing: -0.01em;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .brand-highlight { color: #7fd79d; font-weight: 700; }
    .company-brand { font-size: 16px; gap: 8px; }
    .brand-logo { height: 22px; width: auto; }
    .status-dot {
      font-family: var(--body);
      font-size: 9.5px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }
    .status-dot.online { background: rgba(159,230,185,.16); color: #bff0d2; border: 1px solid rgba(159,230,185,.3); }
    .status-dot.offline { background: rgba(225,18,37,.16); color: #f8b4c0; border: 1px solid rgba(225,18,37,.3); }
    .nav-links { display: flex; gap: 8px; align-items: center; }
    .nav-links a {
      color: rgba(255,255,255,.9);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.16);
      transition: 0.15s;
    }
    .nav-links a:hover { background: rgba(255,255,255,.2); }
    .nav-links a.active { background: rgba(255,255,255,.25); }
    .nav-links a svg { width: 20px; height: 20px; display: block; }
    .ibtn, .logout-btn {
      width: 36px; height: 36px;
      border-radius: 12px;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.16);
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: 0.15s;
    }
    .ibtn:hover, .logout-btn:hover { background: rgba(255,255,255,.2); }
    .ibtn svg, .logout-btn svg { width: 18px; height: 18px; color: #fff; }
  `,
})
export class Navbar {
  protected readonly authService = inject(AuthService);
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly companyService = inject(CompanyService);

  protected readonly bgGradient = computed(() => {
    const c = this.companyService.currentCompany();
    return c ? c.brandGradient : 'linear-gradient(155deg, #1356a0, var(--blue) 60%, #0d3970)';
  });
}
