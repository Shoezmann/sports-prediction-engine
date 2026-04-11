import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterDto } from '@sports-prediction-engine/shared-types';

@Component({
  selector: 'sp-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-glow"></div>
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <span class="material-symbols-rounded auth-logo__icon">analytics</span>
          </div>
          <h1 class="logo">Predict<span class="logo-accent">Engine</span></h1>
          <h2>Create an account</h2>
          <p>Join to start tracking your predictions and performance.</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <div class="input-wrapper">
              <span class="material-symbols-rounded input-icon">person</span>
              <input 
                type="text" 
                id="firstName" 
                formControlName="firstName" 
                placeholder="e.g. John"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <div class="input-wrapper">
              <span class="material-symbols-rounded input-icon">mail</span>
              <input 
                type="email" 
                id="email" 
                formControlName="email" 
                placeholder="you&#64;example.com"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <span class="material-symbols-rounded input-icon">lock</span>
              <input 
                type="password" 
                id="password" 
                formControlName="password" 
                placeholder="Min. 6 characters"
              />
            </div>
          </div>

          @if (errorMessage) {
            <div class="error-message">
              <span class="material-symbols-rounded" style="font-size: 16px; vertical-align: text-bottom; margin-right: 4px;">error</span>
              {{ errorMessage }}
            </div>
          }

          <button type="submit" class="btn-primary btn-submit" [disabled]="registerForm.invalid || isLoading">
            @if (isLoading) {
              <span class="spinner-sm"></span> Creating account...
            } @else {
              Create Account
            }
          </button>

          <p class="auth-footer">
            Already have an account? <a routerLink="/login">Login</a>
          </p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    @keyframes float-glow {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
      50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.6; }
    }

    @keyframes card-enter {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes spin-sm {
      to { transform: rotate(360deg); }
    }

    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: var(--color-bg-primary);
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }

    .auth-glow {
      position: absolute;
      top: 40%;
      left: 50%;
      width: 460px;
      height: 460px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
      transform: translate(-50%, -50%);
      animation: float-glow 6s ease-in-out infinite;
      pointer-events: none;
    }

    .auth-card {
      position: relative;
      background: rgba(15, 16, 19, 0.85);
      backdrop-filter: blur(24px) saturate(150%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      width: 100%;
      max-width: 420px;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.04) inset;
      animation: card-enter 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .auth-logo {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #059669, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
    }

    .auth-logo__icon {
      color: white;
      font-size: 28px;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #fff;
      margin-bottom: 1.25rem;
    }

    .logo-accent {
      background: linear-gradient(135deg, #10b981, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-style: italic;
      margin-left: 2px;
    }

    .auth-header h2 {
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-bottom: 0.375rem;
    }

    .auth-header p {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        color: var(--color-text-secondary);
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.875rem;
      font-size: 18px;
      color: var(--color-text-muted);
      pointer-events: none;
      transition: color 0.2s;
    }

    .input-wrapper:focus-within .input-icon {
      color: #10b981;
    }

    .input-wrapper input {
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-md);
      padding: 0.8125rem 1rem 0.8125rem 2.75rem;
      color: var(--color-text-primary);
      font-size: 0.9375rem;
      font-family: var(--font-family);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: rgba(16, 185, 129, 0.5);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 0 20px rgba(16, 185, 129, 0.08);
        background: rgba(0, 0, 0, 0.5);
      }

      &.ng-invalid.ng-touched {
        border-color: rgba(239, 68, 68, 0.5);
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
      }
    }

    .error-message {
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.15);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      text-align: center;
    }

    .btn-submit {
      margin-top: 0.5rem;
      width: 100%;
      padding: 0.875rem;
      font-size: 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin-sm 0.6s linear infinite;
      display: inline-block;
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);

      a {
        color: #10b981;
        text-decoration: none;
        font-weight: 600;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    @media (max-width: 480px) {
      .auth-card {
        padding: 2rem 1.5rem;
        border-radius: var(--radius-lg);
      }

      .auth-glow {
        width: 300px;
        height: 300px;
      }
    }
  `]
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    firstName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = false;
  errorMessage = '';

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerForm.value as RegisterDto).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
