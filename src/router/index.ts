import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/lobby',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/lobby',
    name: 'Lobby',
    component: () => import('../views/LobbyView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game/:id',
    name: 'Game',
    component: () => import('../views/GameView.vue'),
    meta: { requiresAuth: true },
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Auth guard
router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAuth) {
    const auth = getAuth();
    const user = await new Promise(resolve => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubscribe();
        resolve(u);
      });
    });
    if (!user) {
      next({ name: 'Login' });
      return;
    }
  }
  next();
});

export default router;
