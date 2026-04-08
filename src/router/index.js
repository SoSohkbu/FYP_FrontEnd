import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import HistoryView from "../views/HistoryView.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
    meta: { layout: "DefaultLayout" },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("../views/Login.vue"),
    meta: { layout: "DefaultLayout" },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("../views/Register.vue"),
    meta: { layout: "DefaultLayout" },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: { layout: "AdminLayout", requiresAuth: true },
  },
  {
    path: "/history",
    name: "history",
    component: HistoryView,
    meta: { layout: "AdminLayout", requiresAuth: true },
  },
  {
    path: "/analyze-batch",
    name: "batch",
    component: () => import("../views/BatchAnalyzeView.vue"),
    meta: { layout: "AdminLayout", requiresAuth: true },
  },
  {
    path: "/url-analyze",
    name: "url-analyze",
    component: () => import("../views/UrlAnalyzer.vue"),
    meta: { layout: "AdminLayout", requiresAuth: true },
  },
  {
    path: "/analyze",
    name: "AnalyzeInput",
    component: () => import("../views/SingleTextAnalysis.vue"),
    meta: { layout: "AdminLayout", requiresAuth: true },
  },
  {
    path: "/compare",
    name: "compare",
    component: () => import("../views/CompareView.vue"),
    meta: { layout: "AdminLayout", requiresAuth: true },
  },
  {
    path: "/growth",
    name: "growth",
    component: () => import("../views/GrowthPlanView.vue"),
    meta: { layout: "AdminLayout", requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !localStorage.getItem("user")) {
    next({ name: "login" });
  } else {
    next();
  }
});

export default router;
