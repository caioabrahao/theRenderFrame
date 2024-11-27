import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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