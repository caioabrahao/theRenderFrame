class ContactForm {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.modal = document.getElementById('messageModal');
        this.modalMessage = document.getElementById('modalMessage');
        this.closeModal = document.querySelector('.close-modal');
        this.okButton = document.querySelector('.modal-ok-btn');
        this.initialize();
    }

    initialize() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this.form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };

            // Update button state
            this.submitBtn.textContent = 'Sending...';
            this.submitBtn.disabled = true;

            try {
                // Send the message to you
                await emailjs.send(
                    'default_service',
                    'template_1nol8ru',
                    {
                        ...data,
                        from_name: data.name
                    },
                    'P2nY3JQfgicmgcUw2'
                );

                await new Promise(resolve => setTimeout(resolve, 1000));
                
                this.showModal('Message sent successfully!', 'success');
                this.form.reset();
            } catch (error) {
                console.error('Error:', error);
                this.showModal('There was an error sending your message. Please try again.', 'error');
            } finally {
                this.submitBtn.textContent = 'Send Message';
                this.submitBtn.disabled = false;
            }
        });

        // Close modal when clicking the X
        this.closeModal.addEventListener('click', () => {
            this.hideModal();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });

        // Add OK button listener
        this.okButton.addEventListener('click', () => {
            this.hideModal();
        });
    }

    showModal(message, type) {
        this.modalMessage.textContent = message;
        this.modal.className = `modal ${type}`;
        this.modal.style.display = 'block';
        
        // Show/hide alternatives based on type
        const alternatives = this.modal.querySelector('.modal-alternatives');
        if (alternatives) {
            alternatives.style.display = type === 'error' ? 'block' : 'none';
        }
    }

    hideModal() {
        this.modal.style.display = 'none';
    }
}

// Initialize the contact form
document.addEventListener('DOMContentLoaded', () => {
    new ContactForm();
}); 