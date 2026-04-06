import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import Analyzeresult from "../views/Analyzeresult.vue";
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
    meta: { layout: "AdminLayout" },
  },
  {
    path: "/analyzeresult",
    name: "Analyzeresult",
    component: Analyzeresult,
    meta: { layout: "AdminLayout" },
  },
  {
    path: "/history",
    name: "history",
    component: HistoryView,
    meta: { layout: "AdminLayout" },
  },
  {
    path: "/analyze-batch",
    name: "batch",
    component: () => import("../views/BatchAnalyzeView.vue"),
    meta: { layout: "AdminLayout" },
  },
  {
    path: "/url-analyze",
    name: "url-analyze",
    component: () => import("../views/UrlAnalyzer.vue"),
    meta: { layout: "AdminLayout" },
  },
  {
    path: "/analyze",
    name: "AnalyzeInput",
    component: () => import("../views/SingleTextAnalysis.vue"),
    meta: { layout: "AdminLayout" },
  },

  {
    path: "/compare",
    name: "compare",
    component: () => import("../views/CompareView.vue"),
    meta: { layout: "AdminLayout" },
  },
  {
    path: "/growth",
    name: "growth",
    component: () => import("../views/GrowthPlanView.vue"),
    meta: { layout: "AdminLayout" },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
