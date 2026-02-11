// ─── Auth Store ────────────────────────────────────────────────────────────
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from 'firebase/auth';
import {
  signInWithEmail,
  registerWithEmail,
  signOut,
  onAuth,
} from '../firebase/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const isLoggedIn = computed(() => !!user.value);
  const userId = computed(() => user.value?.uid || null);
  const displayName = computed(() => user.value?.displayName || user.value?.email || 'Anonyme');

  // Listen for auth changes
  function init(): void {
    onAuth((u) => {
      user.value = u;
      loading.value = false;
    });
  }

  async function loginWithEmail(email: string, password: string): Promise<void> {
    try {
      error.value = null;
      await signInWithEmail(email, password);
    } catch (e: any) {
      error.value = e.message;
    }
  }

  async function register(email: string, password: string): Promise<void> {
    try {
      error.value = null;
      await registerWithEmail(email, password);
    } catch (e: any) {
      error.value = e.message;
    }
  }

  async function logout(): Promise<void> {
    try {
      await signOut();
    } catch (e: any) {
      error.value = e.message;
    }
  }

  return {
    user,
    loading,
    error,
    isLoggedIn,
    userId,
    displayName,
    init,
    loginWithEmail,
    register,
    logout,
  };
});
