const urlParams = new URLSearchParams(window.location.search);
const errorCode = urlParams.get('err');
let errorMsg = document.getElementById("errorMsg")

switch(errorCode){
    case 'wrongPass':
        errorMsg.innerText = "Wrong password."
        errorMsg.style.display = "inline-block"
        break;
    case 'noUser':
        errorMsg.innerText = "No such user."
        errorMsg.style.display = "inline-block"
        break;
    case 'usernameTaken':
        errorMsg.innerText = "Username already taken."
        errorMsg.style.display = "inline-block"
        break;
    case 'registerSuccess':
        errorMsg.innerText = "Account created successfuly."
        errorMsg.style.display = "inline-block"
        break;
    case 'notLogged':
        errorMsg.innerText = "You have to log in first."
        errorMsg.style.display = "inline-block"
        break;      
    default:
        errorMsg.innerText = ""
        errorMsg.style.display = "none"
}