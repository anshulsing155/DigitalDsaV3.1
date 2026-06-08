<script>
	let {
		siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY,
		version = 'v2'
	} = $props();


    import { onMount, createEventDispatcher } from 'svelte';
  


  
    const dispatch = createEventDispatcher();
    let recaptchaResponse = '';
    let widgetId = null;
    let isMounted = false;
  
    // Log site key for debugging
    
  
    // Function to initialize reCAPTCHA
    function initializeRecaptcha() {
if (!siteKey) {
// console.error('reCAPTCHA site key is missing or undefined');
return;
}
  
if (!isMounted) {
// console.log('Component not mounted yet, skipping initialization');
return;
}
  
if (window.grecaptcha && window.grecaptcha.render) {
try {
widgetId = window.grecaptcha.render('recaptcha-widget', {
sitekey: siteKey,
callback: (token) => {
recaptchaResponse = token;
dispatch('token', { token });

},
'expired-callback': () => {
recaptchaResponse = '';
dispatch('token', { token: '' });
// console.log('reCAPTCHA token expired');
}
});
// console.log('reCAPTCHA widget rendered with ID:', widgetId);
} catch (error) {
// console.error('Error rendering reCAPTCHA:', error);
}
} else {
// console.log('grecaptcha not ready, retrying...');
setTimeout(initializeRecaptcha, 100); // Retry until loaded
}
    }
  
    onMount(() => {
isMounted = true;
  
const script = document.createElement('script');
script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'; // Explicit mode to prevent auto-rendering
script.async = true;
script.defer = true;
document.head.appendChild(script);
  
script.onload = () => {
// console.log('reCAPTCHA script loaded');
initializeRecaptcha();
};
  
script.onerror = () => {
// console.error('Failed to load reCAPTCHA script');
};
  
return () => {
isMounted = false;
document.head.removeChild(script);
if (window.grecaptcha && widgetId !== null) {
window.grecaptcha.reset(widgetId);
}
};
    });
  
    export function reset() {
if (window.grecaptcha && widgetId !== null) {
window.grecaptcha.reset(widgetId);
recaptchaResponse = '';
dispatch('token', { token: '' });
// console.log('reCAPTCHA reset');
}
    }
  
    export function getToken() {
return recaptchaResponse;
    }
  </script>
  
  <!-- Use a plain div to avoid auto-rendering by reCAPTCHA -->
  <div id="recaptcha-widget" class="recaptcha-container mt-2"></div>
  
  <style>
    .recaptcha-container {
      display: flex;
      justify-content: center;
    }
  </style>