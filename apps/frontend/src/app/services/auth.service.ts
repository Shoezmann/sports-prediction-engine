import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { RegisterDto, LoginDto, AuthResponseDto } from '@sports-prediction-engine/shared-types';

export interface UserSession {
    id: string;
    email: string;
    firstName?: string;
    favoriteSports?: string[];
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_URL = '/api/auth';
    private readonly STORAGE_KEY = 'spe_auth_token';
    private readonly USER_KEY = 'spe_user';

    private currentUserSignal = signal<UserSession | null>(this.loadUserFromStorage());
    currentUser = computed(() => this.currentUserSignal());

    private http = inject(HttpClient);
    private router = inject(Router);

    get isAuthenticated(): boolean {
        return !!this.getToken();
    }

    login(dto: LoginDto): Observable<AuthResponseDto> {
        return this.http.post<AuthResponseDto>(`${this.API_URL}/login`, dto).pipe(
            tap((response: AuthResponseDto) => this.handleAuthentication(response.accessToken, response.user)),
            catchError(err => throwError(() => err))
        );
    }

    register(dto: RegisterDto): Observable<AuthResponseDto> {
        return this.http.post<AuthResponseDto>(`${this.API_URL}/register`, dto).pipe(
            tap((response: AuthResponseDto) => this.handleAuthentication(response.accessToken, response.user)),
            catchError(err => throwError(() => err))
        );
    }

    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.currentUserSignal.set(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return localStorage.getItem(this.STORAGE_KEY);
    }

    private handleAuthentication(token: string, user: UserSession) {
        localStorage.setItem(this.STORAGE_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUserSignal.set(user);
    }

    private loadUserFromStorage(): UserSession | null {
        try {
            const userStr = localStorage.getItem(this.USER_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }
}
