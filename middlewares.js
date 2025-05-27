export function checkLoggedIn(req, res, next){
    if(req.session.user){
        next();
    }
    else{
        res.redirect('/?err=notLogged')
    }
}

export function bypassLogin(req, res, next){
    if(!req.session.user){
        next()
    }
    else{
        res.redirect('/game')
    }
}