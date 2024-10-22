import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';
import HomePage from '@/components/HomePage.vue';
import VideosPage from '@/components/VideosPage.vue';
import VideosPage2 from '@/components/VideosPage2.vue';
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
        path: '/videos2',
        name: 'VideosPage2',
        component: VideosPage2
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
    // {
    //     path: '/:catchAll(.*)',
    //     redirect: '/'
    // }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;

