// Loader removal mechanism
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if(loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease';
            setTimeout(() => { 
                loader.style.display = 'none'; 
            }, 500);
        }
    }, 1500); // 1.5 seconds skeleton loading duration
});

// Normal Center Modal Functions
function showSoon() { 
    document.getElementById('comingSoon').style.display = 'flex'; 
}

function closeModal() { 
    document.getElementById('comingSoon').style.display = 'none'; 
}

// Bottom-Up Menu Modal Functions
function openMenuModal() {
    const overlay = document.getElementById('menuModal');
    const sheet = document.getElementById('bottomSheet');
    
    // First display the overlay
    overlay.style.display = 'flex';
    
    // Small timeout ensures the display:flex is registered before adding animation class
    setTimeout(() => {
        sheet.classList.add('show');
    }, 10);
}

function closeMenuModal() {
    const overlay = document.getElementById('menuModal');
    const sheet = document.getElementById('bottomSheet');
    
    // Remove the slide-up class to slide down
    sheet.classList.remove('show');
    
    // Wait for the slide down animation to finish before hiding overlay
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300); // matches the 0.3s transition in CSS
}
