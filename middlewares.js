exports.checkLoggedIn = (req, res, next)=>{
    if(req.session.user){
        next();
    }
    else{
        res.redirect('/')
    }
}

exports.bypassLogin = (req, res, next)=>{
    if(!req.session.user){
        next()
    }
    else{
        res.redirect('/game')
    }
}