const showLoginBtn = document.getElementById("showLoginBtn")
const loginForm = document.getElementById("loginForm")
const showRegisterBtn = document.getElementById("showRegisterBtn")
const registerForm = document.getElementById("registerForm")

showLoginBtn.onclick = function(){
    registerForm.style.display = "none";
    loginForm.style.display = "inline";
}

showRegisterBtn.onclick = function(){
    loginForm.style.display = "none";
    registerForm.style.display = "inline";
}

// document.onclick = function(){
//     loginForm.style.display = "none";
//     registerForm.style.display = "none";
// }