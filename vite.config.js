import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: '/index.html',
        about: '/pages/about.html',
        projects: '/pages/projects.html',
        contact: '/pages/contact.html',
        editor: '/pages/editor.html',
        editorMenu: '/pages/editor-menu.html'
      }
    }
  }
})