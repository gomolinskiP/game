const errorMsg = document.getElementById("errorMsg")

if(errorMsg){
    const errorCode = errorMsg.dataset.msg;
    let message = "";
    let relatedTo;
    let messageClass = "";

    switch(errorCode){
        case 'wrongPass':
            message = "Wrong password."
            break;
        case 'noUser':
            message = "No user with this username."
            break;
        case 'usernameTaken':
            message = "Username already taken."
            break;
        case 'registerSuccess':
            message = "Account created successfuly."
            messageClass = "success";
            break;
        case 'notLogged':
            message = "You have to log in first."
            break;   
        case 'usernameInvalid':
            message = "Invalid username - please choose a username that is at least 2 and not more than 16 characters long. Use only roman letters and numbers."
            break; 
        case 'passwordInvalid':
            message = "Invalid password - please choose a password that is at least 8 and not more than 32 characters long. It has to contain letters and numbers."
            break;
        default:
            message = `SITE ERROR: no message set for messageCode='${errorCode}'`
    }

    switch(messageClass){
        case "success":
            errorMsg.classList.add(messageClass);
            break;
    }

    errorMsg.innerText = message;
    errorMsg.style.display = "inline-block"
}
