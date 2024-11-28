import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Title animation
gsap.to('.hero h1', {
    scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: '80% top',
        scrub: true
    },
    scale: 0.7,
    y: -100,
    rotationX: 10,
    opacity: 0,
    filter: 'blur(10px)'
});

// Subtitle animation with delay
gsap.to('.hero-subtitle', {
    scrollTrigger: {
        trigger: '.hero',
        start: '20% top', // Starts slightly later
        end: '80% top',
        scrub: true
    },
    scale: 0.7,
    y: -50, // Less vertical movement
    rotationX: 10,
    opacity: 0,
    filter: 'blur(5px)' // Slightly less blur
}); 