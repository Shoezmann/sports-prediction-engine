import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginDto } from '@sports-prediction-engine/shared-types';

@Component({
  selector: 'sp-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  loading = signal(false);
  err = signal('');

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.email?.hasError('email')) this.err.set('Please enter a valid email address');
      else this.err.set('Please fill in all required fields');
      return;
    }
    this.loading.set(true);
    this.err.set('');
    this.auth.login(this.form.value as LoginDto).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/']); },
      error: (e) => {
        this.loading.set(false);
        const m = e.error?.message;
        this.err.set(Array.isArray(m) ? m.join(', ') : (m || 'Invalid email or password'));
      }
    });
  }
}
