<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const auth = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const displayName = ref('');
const isRegister = ref(false);
const localError = ref('');

async function handleSubmit() {
  localError.value = '';
  try {
    if (isRegister.value) {
      await auth.register(email.value, password.value);
    } else {
      await auth.loginWithEmail(email.value, password.value);
    }
    router.push('/lobby');
  } catch (e: any) {
    localError.value = e.message || 'Erreur d\'authentification';
  }
}

</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="title-section">
        <h1>MIDGARD</h1>
        <p class="subtitle">Wargame Stratégique</p>
      </div>

      <div class="form-section">
        <h2>{{ isRegister ? 'Créer un compte' : 'Connexion' }}</h2>

        <form @submit.prevent="handleSubmit">
          <div class="field" v-if="isRegister">
            <label>Nom d'affichage</label>
            <input v-model="displayName" type="text" placeholder="Votre pseudo" />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model="email" type="email" placeholder="email@example.com" required />
          </div>
          <div class="field">
            <label>Mot de passe</label>
            <input v-model="password" type="password" placeholder="••••••••" required minlength="6" />
          </div>
          <button type="submit" class="btn-primary full-width">
            {{ isRegister ? 'Créer le compte' : 'Se connecter' }}
          </button>
        </form>

        <p class="toggle-link" @click="isRegister = !isRegister">
          {{ isRegister ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? Créer un compte' }}
        </p>

        <p class="error" v-if="localError || auth.error">{{ localError || auth.error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #0a1420, #1a2a3a);
}

.login-card {
  width: 400px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.title-section {
  text-align: center;
  padding: 2em 2em 1em;
  background: linear-gradient(to bottom, rgba(212, 165, 90, 0.1), transparent);
}

.title-section h1 {
  font-size: 2.4em;
  letter-spacing: 0.15em;
  margin-bottom: 0.1em;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1em;
}

.form-section {
  padding: 1.5em 2em 2em;
}

.form-section h2 {
  font-size: 1.1em;
  margin-bottom: 1em;
  color: var(--text-primary);
}

.field {
  margin-bottom: 1em;
}

.field label {
  display: block;
  font-size: 0.85em;
  color: var(--text-secondary);
  margin-bottom: 0.3em;
}

.field input {
  width: 100%;
}

.full-width {
  width: 100%;
  padding: 0.7em;
}

.toggle-link {
  text-align: center;
  margin-top: 1.2em;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.9em;
}
.toggle-link:hover {
  text-decoration: underline;
}

.error {
  color: var(--danger);
  text-align: center;
  margin-top: 1em;
  font-size: 0.9em;
}
</style>
