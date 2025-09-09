/**
 * Scheduler Display - Injects HubSpot scheduler into target element
 * Usage: Include this script and have a div with id="scheduler-target" on your page
 */

(function() {
    'use strict';

    const DEBUG = window.location.search.includes('debug=true');
    
    function log(...args) {
        if (DEBUG) console.log('[Scheduler Display]', ...args);
    }

    // Get data from sessionStorage or cookies
    function getRouterData() {
        // Try sessionStorage first
        try {
            const storedData = sessionStorage.getItem('scheduler_router_data');
            if (storedData) {
                const data = JSON.parse(storedData);
                sessionStorage.removeItem('scheduler_router_data'); // Clear after reading
                return data;
            }
        } catch (e) {
            log('SessionStorage error:', e);
        }
        
        // Fallback to cookies
        try {
            const getCookie = (name) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            };
            
            const schedulerType = getCookie('scheduler_type');
            const formDataCookie = getCookie('form_data');
            
            if (schedulerType || formDataCookie) {
                const formData = formDataCookie ? JSON.parse(atob(formDataCookie)) : {};
                
                // Clear cookies
                document.cookie = 'scheduler_type=; path=/; max-age=0';
                document.cookie = 'form_data=; path=/; max-age=0';
                
                return { scheduler_type: schedulerType, formData: formData };
            }
        } catch (e) {
            log('Cookie error:', e);
        }
        
        return null;
    }

    // Get URL parameters
    function getQueryParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    }

    // Fire lead tracking events
    function fireLeadEvents(schedulerType) {
        try {
            // Facebook Pixel
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Lead', {
                    content_category: 'consultation',
                    content_name: schedulerType + '_consultation'
                });
            }
            
            // Reddit Pixel
            if (typeof rdt !== 'undefined') {
                rdt('track', 'Lead', {
                    customEventName: 'ConsultationScheduler',
                    schedulerType: schedulerType
                });
            }
            
            // Google Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'generate_lead', {
                    event_category: 'engagement',
                    event_label: schedulerType + '_consultation'
                });
            } else if (typeof ga !== 'undefined') {
                ga('send', 'event', 'Lead', 'Generate', schedulerType + '_consultation');
            }
            
            // PostHog
            if (typeof window.posthog !== 'undefined') {
                window.posthog.capture('scheduler_lead_generated', {
                    scheduler_type: schedulerType
                });
            }
            
            // Amplitude
            if (typeof window.amplitude !== 'undefined') {
                window.amplitude.track('scheduler_lead_generated', {
                    scheduler_type: schedulerType
                });
            }
            
            log('Lead events fired for:', schedulerType);
        } catch (e) {
            log('Lead tracking error:', e);
        }
    }

    // Inject scheduler into target element
    function injectScheduler() {
        // Find target element
        const target = document.getElementById('scheduler-target');
        if (!target) {
            console.error('[Scheduler Display] No element with id="scheduler-target" found');
            return;
        }

        const urlParams = getQueryParams();
        const routerData = getRouterData();
        
        // Combine data
        let params = { ...urlParams };
        let schedulerType = urlParams.scheduler_type;
        
        if (routerData) {
            if (routerData.formData) {
                params = { ...params, ...routerData.formData };
            }
            if (routerData.scheduler_type) {
                schedulerType = routerData.scheduler_type;
            }
        }
        
        log('Params:', params);
        log('Scheduler type:', schedulerType);
        
        // Determine scheduler type if not provided
        if (!schedulerType && window.HubSpotRouter) {
            schedulerType = window.HubSpotRouter.determineSchedulerType(params);
        }
        
        // Get scheduler URL
        if (!window.HubSpotRouter || !window.HubSpotRouter.config) {
            console.error('[Scheduler Display] HubSpot Router not loaded');
            return;
        }
        
        const config = window.HubSpotRouter.config[schedulerType] || window.HubSpotRouter.config.sole_prop;
        const schedulerUrl = window.HubSpotRouter.buildSchedulerUrl(schedulerType, params);
        
        log('Loading scheduler:', config.name);
        log('URL:', schedulerUrl);
        
        // Inject the scheduler
        target.innerHTML = `<div class="meetings-iframe-container" data-src="${schedulerUrl}"></div>`;
        
        // Load HubSpot embed script
        const script = document.createElement('script');
        script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
        script.onload = function() {
            log('Scheduler loaded');
            fireLeadEvents(schedulerType);
        };
        script.onerror = function() {
            console.error('[Scheduler Display] Failed to load scheduler');
        };
        document.head.appendChild(script);
    }

    // Wait for router to load then inject
    function init() {
        if (window.HubSpotRouter) {
            injectScheduler();
        } else {
            // Wait for router
            let attempts = 0;
            const checkRouter = setInterval(() => {
                attempts++;
                if (window.HubSpotRouter) {
                    clearInterval(checkRouter);
                    injectScheduler();
                } else if (attempts > 20) {
                    clearInterval(checkRouter);
                    console.error('[Scheduler Display] Router timeout');
                }
            }, 100);
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    if (DEBUG) {
        window.SchedulerDisplay = {
            getRouterData,
            getQueryParams,
            fireLeadEvents,
            injectScheduler,
            init
        };
    }
})();