export function checkLoggedIn(req, res, next){
    if(req.session.user){
        next();
    }
    else{
        res.redirect('/?err=notLogged')
        // res.render("index", {isLogged: false, error: "You have to log in to play the game."});
    }
}

export function bypassLogin(req, res, next){
    if(!req.session.user){
        next()
    }
    else{
        next();
        // res.redirect('/game')
    }
}