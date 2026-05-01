import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterDto } from '@sports-prediction-engine/shared-types';

@Component({
  selector: 'sp-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss'
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    firstName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });
  loading = signal(false);
  err = signal('');

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  passwordStrength = signal(0);

  constructor() {
    this.password?.valueChanges.subscribe(v => {
      let s = 0;
      if (v && v.length >= 8) s++;
      if (v && /[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (v && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
      this.passwordStrength.set(s);
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.password?.hasError('minlength')) this.err.set('Password must be at least 8 characters');
      else if (this.email?.hasError('email')) this.err.set('Please enter a valid email');
      else this.err.set('Please fill in all required fields');
      return;
    }
    this.loading.set(true);
    this.err.set('');
    const v = this.form.value;
    this.auth.register({ ...v, firstName: v.firstName || undefined } as RegisterDto).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/']); },
      error: (e) => {
        this.loading.set(false);
        const m = e.error?.message;
        this.err.set(Array.isArray(m) ? m.join(', ') : (m || 'Registration failed. Try again.'));
      }
    });
  }
}
