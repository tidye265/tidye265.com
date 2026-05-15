// LOADER

window.addEventListener('load', () => {

    setTimeout(() => {

        const loader = document.getElementById('loader');

        if(loader){

            loader.style.opacity = '0';
            loader.style.transition = '0.5s';

            setTimeout(() => {

                loader.style.display = 'none';

            }, 500);

        }

    }, 1500);

});

// MENU MODAL

const menuBtn = document.getElementById('menuBtn');
const menuModal = document.getElementById('menuModal');
const closeMenu = document.getElementById('closeMenu');

if(menuBtn){

    menuBtn.addEventListener('click', () => {

        menuModal.style.display = 'flex';

    });

}

if(closeMenu){

    closeMenu.addEventListener('click', () => {

        menuModal.style.display = 'none';

    });

}

window.addEventListener('click', (e) => {

    if(e.target === menuModal){

        menuModal.style.display = 'none';

    }

});
