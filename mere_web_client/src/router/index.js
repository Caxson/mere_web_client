import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '@/components/HomePage.vue';
import VideosPage from '@/components/VideosPage.vue';
import TextPage from '@/components/TextPage.vue';
import VideoCall from "@/components/VideoCall.vue";

const routes = [
    {
        path: '/',
        name: 'HomePage',
        component: HomePage
    },
    {
        path: '/videos',
        name: 'VideosPage',
        component: VideosPage
    },
    {
        path: '/text',
        name: 'TextPage',
        component: TextPage
    },
    {
        path: '/videoCall',
        name: 'videoCall',
        component: VideoCall
    },
    {
        path: '/:catchAll(.*)',
        redirect: '/'
    }
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
});

export default router;

