const menubutton = document.querySelector(".menubutton");
const nav = document.querySelector(".header-nav");
const links = document.querySelectorAll(".header-nav a");
menubutton.addEventListener('click', () => {
    menubutton.classList.toggle('open');
    nav.classList.toggle('open');
});
links.forEach(link => {
    link.addEventListener('click', () => {
        menubutton.classList.remove('open');
        nav.classList.remove('open');
    });
});

const modal = document.getElementById("confirmModal");
const deleteForm = document.getElementById("deleteForm");
const userdeleteForm = document.getElementById("user-deleteForm");
function showModal(id) {
    modal.style.display = "block";
    deleteForm.action = `/delete/${id}`;
}
function closeModal() {
    modal.style.display = "none";
}
function usershowModal(id) {
    modal.style.display = "block";
    userdeleteForm.action = `/user_delete/${id}`;
}
function usercloseModal() {
    modal.style.display = "none";
}


