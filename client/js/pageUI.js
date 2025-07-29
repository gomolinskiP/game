// const showLoginBtn = document.getElementById("showLoginBtn")
// const loginForm = document.getElementById("loginForm")
// const showRegisterBtn = document.getElementById("showRegisterBtn")
// const registerForm = document.getElementById("registerForm")
const errorMsg = document.getElementById("errorMsg")
// const sidebar = document.getElementById("sidebar")
// const pageContent = document.getElementById("pageContent");

// function showLoginForm(){
//     sidebar.style.display = "inline";
//     pageContent.style.marginRight = "150px";
//     registerForm.style.display = "none";
//     loginForm.style.display = "inline";
// }

// function showRegisterForm(){
//     sidebar.style.display = "inline";
//     loginForm.style.display = "none";
//     registerForm.style.display = "inline";
// }

// showLoginBtn.onclick = showLoginForm;

// showRegisterBtn.onclick = showRegisterForm;

// // document.onclick = function(){
// //     loginForm.style.display = "none";
// //     registerForm.style.display = "none";
// // }

if(errorMsg){
    const errorCode = errorMsg.dataset.msg;
    let message = "";
    let relatedTo;
    let messageClass = "";

    switch(errorCode){
        case 'wrongPass':
            message = "Wrong password."
            relatedTo = "login";
            break;
        case 'noUser':
            message = "No such user."
            relatedTo = "login";
            break;
        case 'usernameTaken':
            message = "Username already taken."
            relatedTo = "register";
            break;
        case 'registerSuccess':
            message = "Account created successfuly."
            relatedTo = "register";
            messageClass = "success";
            break;
        case 'notLogged':
            message = "You have to log in first."
            relatedTo = "login";
            break;      
        default:
            message = `SITE ERROR: no message set for messageCode='${errorCode}'`
    }

    switch(messageClass){
        case "success":
            errorMsg.classList.add(messageClass);
    }

    errorMsg.innerText = message;
    errorMsg.style.display = "inline-block"

    switch(relatedTo){
        case "login":
            loginForm.appendChild(errorMsg);
            showLoginForm();
            break;
        case "register":
            registerForm.appendChild(errorMsg);
            showRegisterForm();
            break;
        default:
            console.error("ERROR: Unhandled UI message!")
    }

}
