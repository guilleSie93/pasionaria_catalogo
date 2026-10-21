
import { createRouter, createWebHistory } from 'vue-router';

import Home from '../pages/Home.vue';
import Carrito from '../components/Carrito.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/carrito',
    name: 'carrito',
    component: Carrito
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
